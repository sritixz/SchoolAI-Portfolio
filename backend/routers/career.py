from fastapi import APIRouter, Depends
from dependencies import require_role
from database import get_db

router = APIRouter(prefix="/career", tags=["career"])

@router.get("/domains")
async def list_domains(user=Depends(require_role("student")), db=Depends(get_db)):
    return await db.career_domains.find({}).to_list(None)

@router.get("/{domain_id}")
async def domain_careers(domain_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    return await db.careers.find({"domain_id": domain_id}).to_list(None)

@router.get("/{domain_id}/{career_id}")
async def career_detail(domain_id: str, career_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    return await db.careers.find_one({"_id": career_id, "domain_id": domain_id})
