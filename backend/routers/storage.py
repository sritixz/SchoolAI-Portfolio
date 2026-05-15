from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from typing import List
from dependencies import get_current_user
from services.s3 import upload_file

router = APIRouter(prefix="/storage", tags=["storage"])

ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", 
    "image/heic", "image/heif", "application/pdf"
}
MAX_SIZE_MB = 20
MAX_FILES = 10

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    folder: str = Form("uploads"),
    user=Depends(get_current_user),
):
    """Single file upload endpoint (legacy support)"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed")
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {MAX_SIZE_MB}MB limit")
    url = upload_file(content, file.filename, folder=f"{folder}/{user['id']}")
    return {"url": url, "filename": file.filename}


@router.post("/upload-multiple")
async def upload_multiple(
    files: List[UploadFile] = File(...),
    folder: str = Form("uploads"),
    user=Depends(get_current_user),
):
    """
    Multi-file upload endpoint.
    Supports up to 10 images at once for OCR/homework submissions.
    Returns array of {url, filename} objects.
    """
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"Maximum {MAX_FILES} files allowed per upload")
    
    results = []
    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"File type {file.content_type} not allowed: {file.filename}")
        
        content = await file.read()
        if len(content) > MAX_SIZE_MB * 1024 * 1024:
            raise HTTPException(400, f"File {file.filename} exceeds {MAX_SIZE_MB}MB limit")
        
        url = upload_file(content, file.filename, folder=f"{folder}/{user['id']}")
        results.append({"url": url, "filename": file.filename})
    
    return {"files": results, "count": len(results)}
