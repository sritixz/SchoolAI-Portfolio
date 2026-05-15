from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
backend_dir = Path(__file__).parent
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)

class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "bawan"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60*24*60  # 60 days

    # OpenRouter (LLM)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    VIN_MODEL: str = "google/gemini-flash-1.5"  # Vin AI uses Gemini Flash

    # Groq (Speech-to-Text)
    GROQ_API_KEY: str = ""

    # AssemblyAI (Speech-to-Text)
    ASSEMBLYAI_API_KEY: str = ""

    # Pinecone
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "bawan-knowledge"
    PINECONE_ENV: str = "us-east-1"

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET: str = "bawan-uploads"
    AWS_S3_BUCKET: str = "bawan-uploads"  # Alternative name

    # SMTP (Gmail)
    SMTP_USER: str = ""         # your-school@gmail.com
    SMTP_PASSWORD: str = ""     # Gmail App Password (not account password)
    SMTP_FROM_NAME: str = "VinSchool"

    # Client
    CLIENT_URL: str = "http://localhost:3000"
    is_production: str = "development"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Image generation (optional — leave blank to skip images)
    IMAGE_API_KEY: str = ""
    IMAGE_API_URL: str = "https://api.openai.com/v1/images/generations"

    # Pexels — free forever, no attribution required, 200 req/hr, 20k/month
    PEXELS_API_KEY: str = ""

    # Media search
    YOUTUBE_API_KEY: str = ""
    MEDIA_CACHE_TTL_DAYS: int = 30

    # Google Custom Search (images) — free 100 queries/day
    # Get API key: https://developers.google.com/custom-search/v1/introduction
    # Create CSE: https://programmablesearchengine.google.com/
    GOOGLE_CSE_API_KEY: str = ""
    GOOGLE_CSE_ID: str = ""  # Your Programmable Search Engine ID

    # Serper.dev (Google Images) — 2,500 free searches on signup, ~1s response
    # Get your key at: https://serper.dev (no credit card required)
    SERPER_API_KEY: str = ""

    # Dev
    DEBUG: bool = True          # set False in production to hide dev_otp

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from .env

settings = Settings()
