from fastapi import APIRouter, Depends
from dependencies import require_role
from database import get_db
from models.portfolio import PortfolioEntry

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/student")
async def student_portfolio(user=Depends(require_role("student")), db=Depends(get_db)):
    return await db.portfolio_entries.find({"student_id": user["id"]}).sort("_id", -1).to_list(None)

@router.get("/student/{student_id}")
async def portfolio_by_id(student_id: str, user=Depends(require_role("teacher", "parent", "schooladmin")), db=Depends(get_db)):
    return await db.portfolio_entries.find({"student_id": student_id}).sort("_id", -1).to_list(None)

@router.post("/")
async def add_entry(entry: PortfolioEntry, user=Depends(require_role("teacher", "parent")), db=Depends(get_db)):
    doc = entry.dict()
    doc["author_id"] = user["id"]
    result = await db.portfolio_entries.insert_one(doc)
    return {"id": str(result.inserted_id)}
