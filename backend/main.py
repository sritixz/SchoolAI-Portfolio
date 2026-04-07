from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import connect_db, close_db
from routers import auth, student, teacher, parent, school_admin, homework, vin_ai, learning_gaps, career, portfolio, storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(title="Bawan API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174",
        "https://trueschoolai.com",
        "https://www.trueschoolai.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(parent.router)
app.include_router(school_admin.router)
app.include_router(homework.router)
app.include_router(vin_ai.router)
app.include_router(learning_gaps.router)
app.include_router(career.router)
app.include_router(portfolio.router)
app.include_router(storage.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
