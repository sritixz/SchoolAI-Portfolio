"""
OCR Service — extracts text from image and PDF submissions.

Entry points:
  extract_text_from_url(file_url: str) -> str
  extract_text_from_urls(file_urls: list[str]) -> str   (multi-image, combined)

Never raises; returns "" on any failure.
"""
import base64
import logging
import re
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
MULTI_IMAGE_PROMPT = (
    "These are multiple pages/images from a single homework submission. "
    "Transcribe all handwritten and typed text from ALL images in order. "
    "Label each page as 'Page 1:', 'Page 2:', etc. Maintain formatting."
)

SUPPORTED_IMAGE_EXTS = {"jpg", "jpeg", "png", "heic", "heif", "gif", "webp"}

# S3 URL pattern — used to detect if we need a presigned URL
_S3_URL_RE = re.compile(r"https://[^/]+\.s3\.[^/]+\.amazonaws\.com/(.+?)(?:\?|$)")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_s3_key(url: str):
    """Extract S3 key from a public S3 URL, or None if not an S3 URL."""
    m = _S3_URL_RE.match(url)
    return m.group(1) if m else None


def _normalise_image(img_bytes: bytes, filename: str) -> bytes:
    """
    Convert image to RGB, resize longest side to ≤ MAX_PX (2048).
    Returns JPEG bytes at quality 85.
    Supports JPEG, PNG, HEIC/HEIF (via pillow-heif).
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("heic", "heif"):
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


async def _download_file(url: str) -> bytes:
    """
    Download a file from a URL.
    For S3 URLs, tries a presigned URL first if the direct download fails (private bucket).
    """
    # Strip query params to get clean URL for extension detection
    clean_url = url.split("?")[0]

    async with httpx.AsyncClient(timeout=30) as client:
        # First try the URL as-is (works for public buckets or already-presigned URLs)
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.content
        except Exception:
            pass

        # If it's an S3 URL and direct access failed, generate a presigned URL
        s3_key = _get_s3_key(clean_url)
        if s3_key:
            try:
                from services.s3 import generate_presigned_url
                presigned = generate_presigned_url(s3_key, expires_in=300)
                resp = await client.get(presigned)
                resp.raise_for_status()
                return resp.content
            except Exception as e:
                logger.error("Presigned URL download failed for key %s: %s", s3_key, e)
                raise

        # Non-S3 URL that failed
        raise httpx.HTTPStatusError(f"Failed to download {url}", request=None, response=None)


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


async def _vision_extract_multi(image_bytes_list: list[bytes]) -> str:
    """
    Send multiple images to GPT-4o Vision in a single request.
    More efficient than individual calls and preserves context across pages.
    """
    content = [{"type": "text", "text": MULTI_IMAGE_PROMPT}]
    for img_bytes in image_bytes_list:
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        content.append({
            "type": "image_url",
            "image_url": {"url": "data:image/jpeg;base64," + b64},
        })

    messages = [{"role": "user", "content": content}]
    result = await chat_completion(messages, model=VISION_MODEL, timeout=180)
    return result.strip()


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

async def extract_text_from_url(file_url: str) -> str:
    """
    Download file from URL, detect type, extract text.
    Returns extracted text string, or "" on failure.
    Never raises — errors are caught and logged.
    """
    try:
        file_bytes = await _download_file(file_url)

        # Detect extension from URL (strip query params first)
        clean_url = file_url.split("?")[0]
        ext = clean_url.rsplit(".", 1)[-1].lower() if "." in clean_url else ""

        if ext == "pdf":
            text = _pdf_extract_text(file_bytes)
            if not text:
                # Scanned PDF fallback: render page 1 as image
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


async def extract_text_from_urls(file_urls: list[str]) -> str:
    """
    Extract text from multiple image/PDF URLs.
    - PDFs are extracted individually (text-based or vision fallback).
    - Images are batched into a single multi-image GPT-4o call for efficiency.
    - Returns combined text, or "" on total failure.
    Never raises.
    """
    if not file_urls:
        return ""

    if len(file_urls) == 1:
        return await extract_text_from_url(file_urls[0])

    try:
        image_bytes_list = []
        pdf_texts = []

        for url in file_urls:
            clean_url = url.split("?")[0]
            ext = clean_url.rsplit(".", 1)[-1].lower() if "." in clean_url else ""

            try:
                file_bytes = await _download_file(url)
            except Exception as e:
                logger.error("Failed to download %s: %s", url, e)
                continue

            if ext == "pdf":
                text = _pdf_extract_text(file_bytes)
                if not text:
                    try:
                        norm_bytes = _normalise_image(file_bytes, "page.jpg")
                        image_bytes_list.append(norm_bytes)
                    except Exception as e:
                        logger.error("Scanned PDF render failed for %s: %s", url, e)
                else:
                    pdf_texts.append(text)

            elif ext in SUPPORTED_IMAGE_EXTS:
                try:
                    norm_bytes = _normalise_image(file_bytes, clean_url)
                    image_bytes_list.append(norm_bytes)
                except Exception as e:
                    logger.error("Image normalise failed for %s: %s", url, e)

        parts = []

        # Batch all images into one vision call
        if image_bytes_list:
            if len(image_bytes_list) == 1:
                img_text = await _vision_extract(image_bytes_list[0])
            else:
                img_text = await _vision_extract_multi(image_bytes_list)
            if img_text:
                parts.append(img_text)

        # Append any PDF text extractions
        parts.extend(pdf_texts)

        return "\n\n".join(parts).strip()

    except Exception as e:
        logger.error("Multi-URL OCR failed: %s", e)
        return ""
