"""
Media search router — images and videos for VinAI, Concept Explainer, and PPT.
Endpoints are accessible to both students and teachers.
Results are cached in MongoDB for 30 days.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import get_db
from dependencies import get_current_user
from services.media_search import search_images, search_videos, get_cached_or_search

router = APIRouter(prefix="/media", tags=["media"])


class MediaSearchRequest(BaseModel):
    query: str
    grade: Optional[str] = ""
    board: Optional[str] = "CBSE"
    max_results: Optional[int] = 6


@router.post("/images/clear-cache")
async def clear_image_cache_endpoint(
    body: MediaSearchRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Clear cached image results for a query, forcing a fresh search."""
    query = body.query.strip()
    cache_key = f"img:{query.lower()}:{body.board or ''}:{body.grade or ''}"
    await db.media_cache.delete_one({"key": cache_key})
    return {"cleared": True}


@router.post("/images")
async def image_search(
    body: MediaSearchRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Search for educational images via Google Images (Serper). Results cached 30 days."""
    if not body.query.strip():
        raise HTTPException(400, "query is required")

    query = body.query.strip()
    cache_key = f"img:{query.lower()}:{body.board}:{body.grade}"
    results = await get_cached_or_search(
        db, cache_key,
        search_images,
        query, body.grade, body.board, body.max_results or 6,
    )
    return {"results": results}


@router.post("/videos")
async def video_search(
    body: MediaSearchRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Search for educational videos via yt-dlp + YouTube Data API. Results cached 30 days."""
    if not body.query.strip():
        raise HTTPException(400, "query is required")

    query = body.query.strip()
    cache_key = f"vid:{query.lower()}:{body.board}:{body.grade}"
    results = await get_cached_or_search(
        db, cache_key,
        search_videos,
        query, body.grade, body.board, body.max_results or 4,
    )
    return {"results": results}


@router.post("/both")
async def media_both(
    body: MediaSearchRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Fetch images and videos in a single request (parallel).
    Faster than two separate calls — used by MediaPanel.
    """
    if not body.query.strip():
        raise HTTPException(400, "query is required")

    query = body.query.strip()
    img_key = f"img:{query.lower()}:{body.board}:{body.grade}"
    vid_key = f"vid:{query.lower()}:{body.board}:{body.grade}"

    images, videos = await asyncio.gather(
        get_cached_or_search(db, img_key, search_images, query, body.grade, body.board, 6),
        get_cached_or_search(db, vid_key, search_videos, query, body.grade, body.board, 4),
    )
    return {"images": images or [], "videos": videos or []}
