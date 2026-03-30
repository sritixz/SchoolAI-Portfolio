from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from dependencies import get_current_user
from services.s3 import upload_file

router = APIRouter(prefix="/storage", tags=["storage"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf", "image/gif"}
MAX_SIZE_MB = 20

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    folder: str = "uploads",
    user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed")
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {MAX_SIZE_MB}MB limit")
    url = upload_file(content, file.filename, folder=f"{folder}/{user['id']}")
    return {"url": url, "filename": file.filename}
