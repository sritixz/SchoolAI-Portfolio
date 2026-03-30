from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "bawan"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # OpenRouter (LLM)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"

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

    # Dev
    DEBUG: bool = True          # set False in production to hide dev_otp

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from .env

settings = Settings()
