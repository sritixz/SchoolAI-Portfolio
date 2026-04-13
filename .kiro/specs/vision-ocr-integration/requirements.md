# Requirements Document

## Introduction

Students on the platform submit homework as image files (JPG, PNG, HEIC) or PDFs. Currently the AI grader receives `[file uploaded]` as the student answer, making its feedback meaningless. This feature introduces an OCR pipeline (`backend/services/ocr.py`) that normalises uploaded files, extracts text via pdfminer (text PDFs) or GPT-4o Vision via OpenRouter (images and scanned PDFs), and stores the result as `extracted_text` in the submission document so the AI grader can produce real, content-aware feedback.

The change is purely backend. No frontend modifications are required.

## Glossary

- **OCR_Service**: The `ocr.py` module responsible for downloading, normalising, and extracting text from submitted files
- **Homework_Router**: The `homework.py` FastAPI router, specifically the `_run_analysis` background task
- **AI_Grader**: The `ai_grader.py` service that analyses student submissions and produces structured feedback
- **Vision_LLM**: GPT-4o accessed via OpenRouter, used to transcribe image content to text
- **PDF_Extractor**: The pdfminer.six library used to extract text from text-based PDF files
- **Image_Normaliser**: The Pillow-based image processing step that converts images to RGB JPEG at ≤ 2048px
- **Submission**: A MongoDB document representing a student's homework submission, containing `submission_file_url`, `extracted_text`, and `ai_analysis` fields

---

## Requirements

### Requirement 1: OCR Service Module

**User Story:** As a developer, I want a dedicated OCR service module, so that file-to-text extraction logic is encapsulated and reusable across the application.

#### Acceptance Criteria

1. THE OCR_Service SHALL expose an `extract_text_from_url(file_url: str) -> str` async function as its primary public interface
2. THE OCR_Service SHALL detect the file type from the URL extension (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.heic`)
3. WHEN an unsupported file extension is encountered, THE OCR_Service SHALL log a warning and return an empty string
4. IF any exception occurs during extraction, THEN THE OCR_Service SHALL catch the exception, log the error, and return an empty string without propagating the exception to the caller
5. THE OCR_Service SHALL download file bytes from the provided S3 URL using httpx

---

### Requirement 2: Image Normalisation

**User Story:** As a developer, I want images normalised before being sent to the Vision LLM, so that token costs are controlled and all image formats are handled uniformly.

#### Acceptance Criteria

1. WHEN an image file is processed, THE Image_Normaliser SHALL convert the image to RGB colour space
2. WHEN an image's longest side exceeds 2048 pixels, THE Image_Normaliser SHALL resize the image so the longest side equals 2048 pixels while preserving the aspect ratio
3. WHEN an image's longest side is 2048 pixels or fewer, THE Image_Normaliser SHALL perform colour conversion only without resizing
4. THE Image_Normaliser SHALL output JPEG bytes at quality 85
5. WHEN a `.heic` file is processed, THE Image_Normaliser SHALL use pillow-heif to decode the HEIC format before normalisation
6. IF image decoding fails for any reason, THEN THE OCR_Service SHALL catch the exception, log the error, and return an empty string

---

### Requirement 3: PDF Text Extraction

**User Story:** As a developer, I want text-based PDFs processed with pdfminer, so that Vision API calls are avoided for PDFs that already contain extractable text.

#### Acceptance Criteria

1. WHEN a `.pdf` file is provided, THE PDF_Extractor SHALL attempt to extract text using pdfminer.six
2. WHEN pdfminer.six extracts non-empty text from a PDF, THE OCR_Service SHALL return that text without calling the Vision_LLM
3. WHEN pdfminer.six returns an empty string (indicating a scanned or image-only PDF), THE OCR_Service SHALL fall back to the Vision_LLM path using the first page rendered as an image
4. THE PDF_Extractor SHALL return a stripped string and SHALL return an empty string if no extractable text is found

---

### Requirement 4: Vision LLM Transcription

**User Story:** As a developer, I want image content transcribed via GPT-4o Vision, so that handwritten and scanned homework submissions can be read by the AI grader.

#### Acceptance Criteria

1. WHEN an image requires transcription, THE Vision_LLM SHALL be called with a base64-encoded JPEG payload via the existing `chat_completion` function in `llm.py`
2. THE OCR_Service SHALL use the model identifier `openai/gpt-4o` when calling the Vision_LLM via OpenRouter
3. THE OCR_Service SHALL include a prompt instructing the Vision_LLM to transcribe all handwritten and typed text while maintaining formatting
4. WHEN the Vision_LLM returns a response, THE OCR_Service SHALL return the stripped text content
5. IF the Vision_LLM call raises an exception or returns malformed content, THEN THE OCR_Service SHALL catch the exception, log the error, and return an empty string

---

### Requirement 5: Homework Router OCR Integration

**User Story:** As a teacher, I want OCR to run automatically when a student submits a file-based homework, so that the AI grader receives the actual content without any manual intervention.

#### Acceptance Criteria

1. WHEN a submission document contains a non-empty `submission_file_url`, THE Homework_Router SHALL call `extract_text_from_url` before invoking the AI_Grader
2. WHEN `extract_text_from_url` returns a non-empty string, THE Homework_Router SHALL persist the result as `extracted_text` in the submission document in MongoDB
3. WHEN `extracted_text` is stored in MongoDB, THE Homework_Router SHALL also inject it into the in-memory submission dict so the AI_Grader receives it in the same background task execution
4. WHEN a submission has no `submission_file_url`, THE Homework_Router SHALL skip the OCR step and proceed directly to AI grading
5. THE Homework_Router SHALL continue to call `analyse_submission` after the OCR step regardless of whether OCR produced text

---

### Requirement 6: AI Grader Extracted Text Usage

**User Story:** As a teacher, I want the AI grader to use the OCR-extracted text when grading file submissions, so that feedback is based on the student's actual written content rather than a placeholder.

#### Acceptance Criteria

1. WHEN building the student answer for a question, THE AI_Grader SHALL use `ans.get("answer")` as the first priority
2. WHEN `ans.get("answer")` is falsy, THE AI_Grader SHALL use `sub.get("extracted_text")` as the student answer
3. WHEN both `ans.get("answer")` and `sub.get("extracted_text")` are falsy, THE AI_Grader SHALL fall back to `ans.get("file_url", "[file uploaded]")`
4. WHILE `extracted_text` is absent from the submission, THE AI_Grader SHALL behave identically to its current behaviour (no regression)

---

### Requirement 7: Dependency Management

**User Story:** As a developer, I want the required Python packages declared in requirements.txt, so that the OCR feature can be installed in any environment.

#### Acceptance Criteria

1. THE requirements.txt SHALL include `pillow-heif` at its latest available version
2. THE requirements.txt SHALL include `pdfminer.six==20231228` as an active (uncommented) dependency
3. THE requirements.txt SHALL include `pillow==11.3.0` as an active (uncommented) dependency
4. WHEN the dependencies are installed, THE OCR_Service SHALL be importable without errors

---

### Requirement 8: Error Resilience and Graceful Degradation

**User Story:** As a student, I want my submission to be stored and graded even if OCR fails, so that a transient error in text extraction does not block my homework from being processed.

#### Acceptance Criteria

1. IF the S3 file download fails due to a network error, THEN THE OCR_Service SHALL return an empty string and the submission SHALL remain in the database with its original fields intact
2. IF the Vision_LLM is unavailable or returns an error, THEN THE Homework_Router SHALL proceed to call the AI_Grader with the submission as-is
3. IF OCR returns an empty string, THEN THE AI_Grader SHALL fall back to `[file uploaded]` as the student answer, preserving existing behaviour
4. THE Homework_Router SHALL store `ai_analysis` and `ai_analysed_at` in the submission document regardless of whether OCR succeeded
