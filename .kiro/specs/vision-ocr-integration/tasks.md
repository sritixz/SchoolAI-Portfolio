# Implementation Tasks: Vision OCR Integration

## Tasks

- [x] 1. Update dependencies in requirements.txt
  - Uncomment `pdfminer.six==20231228`
  - Uncomment `pillow==11.3.0`
  - Add `pillow-heif` (latest)
  - **Validates: Requirement 7**

- [x] 2. Create `backend/services/ocr.py`
  - [x] 2.1 Implement `_normalise_image(img_bytes, filename) -> bytes`
    - Register pillow-heif opener for HEIC support
    - Open image with Pillow, convert to RGB
    - Resize longest side to ≤ 2048px using `thumbnail()` with LANCZOS
    - Save as JPEG quality 85 and return bytes
    - **Validates: Requirements 2.1–2.6**
  - [x] 2.2 Implement `_pdf_extract_text(pdf_bytes) -> str`
    - Use `pdfminer.six` `extract_text_from_fp` on a `BytesIO` wrapper
    - Return stripped text, or `""` if empty
    - **Validates: Requirements 3.1, 3.4**
  - [x] 2.3 Implement `_vision_extract(image_bytes) -> str`
    - Base64-encode the JPEG bytes
    - Build vision-compatible message payload with `data:image/jpeg;base64,` URL
    - Call `chat_completion` from `services.llm` with model `openai/gpt-4o`
    - Return stripped response text
    - **Validates: Requirements 4.1–4.4**
  - [x] 2.4 Implement `extract_text_from_url(file_url) -> str` (async, public entry point)
    - Download file bytes via `httpx.AsyncClient` with 30s timeout
    - Detect extension from URL (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.heic`)
    - PDF path: call `_pdf_extract_text`; if empty, render page 1 as image and call `_vision_extract`
    - Image path: call `_normalise_image` then `_vision_extract`
    - Unsupported extension: log warning, return `""`
    - Wrap entire function body in try/except; log errors and return `""` on any failure
    - **Validates: Requirements 1.1–1.5, 3.2, 3.3, 8.1**

- [x] 3. Update `backend/routers/homework.py` — `_run_analysis`
  - Import `extract_text_from_url` from `services.ocr`
  - Before calling `analyse_submission`, check `sub.get("submission_file_url")`
  - If present, call `await extract_text_from_url(file_url)`
  - If result is non-empty, `update_one` with `{"$set": {"extracted_text": extracted_text}}` and set `sub["extracted_text"]`
  - Always call `analyse_submission` and store `ai_analysis` / `ai_analysed_at` regardless of OCR outcome
  - **Validates: Requirements 5.1–5.5, 8.2, 8.4**

- [x] 4. Update `backend/services/ai_grader.py` — answer resolution
  - In the `qa_pairs` loop, replace the `student_answer` line with the three-level priority chain:
    `ans.get("answer") or sub.get("extracted_text") or ans.get("file_url", "[file uploaded]")`
  - **Validates: Requirements 6.1–6.4**
