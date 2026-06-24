from fastapi import APIRouter, Depends
from bson import ObjectId
from dependencies import require_role
from database import get_db

router = APIRouter(prefix="/career", tags=["career"])

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/domains")
async def list_domains(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.career_domains.find({}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/domains/{domain_id}")
async def get_domain(domain_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.career_domains.find_one({"id": domain_id})
    return _ser(doc) if doc else None

@router.get("/{domain_id}")
async def domain_careers(domain_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.careers.find({"domain_id": domain_id}).to_list(None)
    return [_ser(d) for d in docs]
@router.get("/{domain_id}/{career_id}")
async def career_detail(domain_id: str, career_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    # Try by string id field first (our seeded data uses string ids)
    doc = await db.careers.find_one({"id": career_id, "domain_id": domain_id})
    if not doc:
        # Try by _id
        try:
            doc = await db.careers.find_one({"_id": ObjectId(career_id), "domain_id": domain_id})
        except Exception:
            pass
    return _ser(doc) if doc else None
