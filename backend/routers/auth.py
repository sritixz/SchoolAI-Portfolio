"""
Auth router — two login strategies:
  • Email + password  → teachers, parents, school admins
  • Phone + OTP       → students (OTP stored hashed in DB, sent via SMS or shown in dev)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from bson import ObjectId
import random, string

from models.user import (
    EmailLoginRequest, PhoneOtpRequest, PhoneOtpVerify,
    RegisterRequest, ChangePasswordRequest, TokenResponse,
)
from database import get_db
from dependencies import get_current_user
from config import settings

router   = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Helpers ──────────────────────────────────────────────────

def _token(user_id: str, role: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "role": role, "exp": exp},
                      settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def _gen_otp(n=6) -> str:
    return "".join(random.choices(string.digits, k=n))

def _gen_password(n=10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return "".join(random.choices(chars, k=n))

def _ser(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ── Email + password (teacher / parent / schooladmin) ────────

@router.post("/login", response_model=TokenResponse)
async def email_login(body: EmailLoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": body.email, "role": body.role})
    if not user or not pwd_ctx.verify(body.password, user.get("hashed_password", "")):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    return TokenResponse(
        access_token=_token(uid, user["role"]),
        user_id=uid, role=user["role"], name=user["name"],
        avatar=user.get("avatar"),
        must_change_password=user.get("must_change_password", False),
    )

@router.post("/register", response_model=TokenResponse)
async def email_register(body: RegisterRequest, db=Depends(get_db)):
    """Self-registration — only for school admins bootstrapping a new school."""
    if await db.users.find_one({"email": body.email, "role": body.role}):
        raise HTTPException(400, "Email already registered for this role")
    doc = {
        "name": body.name, "email": body.email, "role": body.role,
        "hashed_password": pwd_ctx.hash(body.password),
        "avatar": None, "created_at": datetime.utcnow().isoformat(),
        "must_change_password": False, "status": "active",
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    return TokenResponse(access_token=_token(uid, body.role),
                         user_id=uid, role=body.role, name=body.name)

@router.post("/change-password")
async def change_password(body: ChangePasswordRequest,
                          user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not doc or not pwd_ctx.verify(body.current_password, doc.get("hashed_password", "")):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"hashed_password": pwd_ctx.hash(body.new_password),
                  "must_change_password": False}},
    )
    return {"status": "password_changed"}

# ── Phone OTP (students) ─────────────────────────────────────

@router.post("/otp/request")
async def request_otp(body: PhoneOtpRequest, db=Depends(get_db)):
    """
    Check phone is registered, generate OTP, store hash.
    In production: send via SMS (Twilio / MSG91).
    In dev: OTP is returned in the response for testing.
    """
    user = await db.users.find_one({"phone": body.phone, "role": body.role})
    if not user:
        raise HTTPException(404, "Phone number not registered. Contact your school admin.")

    otp = _gen_otp()
    expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"otp_hash": pwd_ctx.hash(otp), "otp_expires": expires}},
    )
    # TODO: send SMS via provider
    # In dev mode, return OTP directly (remove in production)
    return {"message": "OTP sent", "dev_otp": otp if settings.DEBUG else None}

@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(body: PhoneOtpVerify, db=Depends(get_db)):
    user = await db.users.find_one({"phone": body.phone, "role": body.role})
    if not user:
        raise HTTPException(404, "Phone not registered")

    otp_hash    = user.get("otp_hash", "")
    otp_expires = user.get("otp_expires", "")

    if not otp_hash or not pwd_ctx.verify(body.otp, otp_hash):
        raise HTTPException(401, "Invalid OTP")
    if not otp_expires:
        raise HTTPException(401, "OTP expired. Request a new one.")
    try:
        if datetime.fromisoformat(otp_expires) < datetime.utcnow():
            raise HTTPException(401, "OTP expired. Request a new one.")
    except ValueError:
        raise HTTPException(401, "OTP expired. Request a new one.")

    # Invalidate OTP after use
    await db.users.update_one({"_id": user["_id"]}, {"$unset": {"otp_hash": "", "otp_expires": ""}})

    uid = str(user["_id"])
    return TokenResponse(access_token=_token(uid, user["role"]),
                         user_id=uid, role=user["role"], name=user["name"],
                         avatar=user.get("avatar"))

# ── /me ──────────────────────────────────────────────────────

@router.get("/me")
async def me(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])},
                                  {"hashed_password": 0, "otp_hash": 0})
    if not doc:
        raise HTTPException(404, "User not found")
    return _ser(doc)
