"""
OCR Service — extracts text from image and PDF submissions.

Entry point: extract_text_from_url(file_url: str) -> str
Never raises; returns "" on any failure.
"""
import base64
import logging
from io import BytesIO

import httpx
from PIL import Image

from services.llm import chat_completion

logger = logging.getLogger(__name__)

MAX_PX = 2048
VISION_MODEL = "openai/gpt-4o"
VISION_PROMPT = (
    "Transcribe all handwritten and typed text from this homework submission. "
    "Maintain formatting."
)

SUPPORTED_IMAGE_EXTS = {"jpg", "jpeg", "png", "heic"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise_image(img_bytes: bytes, filename: str) -> bytes:
    """
    Convert image to RGB, resize longest side to ≤ MAX_PX (2048).
    Returns JPEG bytes at quality 85.
    Supports JPEG, PNG, HEIC (via pillow-heif).
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "heic":
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            logger.warning("pillow-heif not installed; HEIC decode may fail")

    img = Image.open(BytesIO(img_bytes))

    if img.mode != "RGB":
        img = img.convert("RGB")

    if max(img.width, img.height) > MAX_PX:
        img.thumbnail((MAX_PX, MAX_PX), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _pdf_extract_text(pdf_bytes: bytes) -> str:
    """
    Use pdfminer.six to extract text from PDF bytes.
    Returns stripped text, or "" if none found.
    """
    from pdfminer.high_level import extract_text

    text = extract_text(BytesIO(pdf_bytes)) or ""
    return text.strip()


async def _vision_extract(image_bytes: bytes) -> str:
    """
    Base64-encode JPEG bytes and send to GPT-4o Vision via chat_completion.
    Returns stripped transcription text.
    """
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": VISION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {"url": "data:image/jpeg;base64," + b64},
                },
            ],
        }
    ]
    result = await chat_completion(messages, model=VISION_MODEL)
    return result.strip()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def extract_text_from_url(file_url: str) -> str:
    """
    Download file from S3 URL, detect type, extract text.
    Returns extracted text string, or "" on failure.
    Never raises — errors are caught and logged.
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(file_url)
            resp.raise_for_status()
            file_bytes = resp.content

        # Detect extension from URL (strip query params first)
        clean_url = file_url.split("?")[0]
        ext = clean_url.rsplit(".", 1)[-1].lower() if "." in clean_url else ""

        if ext == "pdf":
            text = _pdf_extract_text(file_bytes)
            if not text:
                # Scanned PDF fallback: try to render page 1 as image
                try:
                    norm_bytes = _normalise_image(file_bytes, "page.jpg")
                    text = await _vision_extract(norm_bytes)
                except Exception as e:
                    logger.error("Scanned PDF image render failed for %s: %s", file_url, e)
                    text = ""
            return text

        elif ext in SUPPORTED_IMAGE_EXTS:
            norm_bytes = _normalise_image(file_bytes, clean_url)
            return await _vision_extract(norm_bytes)

        else:
            logger.warning("Unsupported file type '%s' for URL: %s", ext, file_url)
            return ""

    except Exception as e:
        logger.error("OCR failed for %s: %s", file_url, e)
        return ""
