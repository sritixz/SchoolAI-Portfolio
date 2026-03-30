"""
AWS S3 service — handles homework submission uploads,
presentation files, worksheets, and portfolio attachments.
"""
import boto3
from botocore.exceptions import ClientError
from config import settings
import uuid, mimetypes

s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

def upload_file(file_bytes: bytes, filename: str, folder: str = "uploads") -> str:
    """Upload bytes to S3 and return the public URL."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    key = f"{folder}/{uuid.uuid4().hex}.{ext}"
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    
    # Use AWS_S3_BUCKET if available, otherwise fall back to S3_BUCKET
    bucket = settings.AWS_S3_BUCKET if hasattr(settings, 'AWS_S3_BUCKET') and settings.AWS_S3_BUCKET else settings.S3_BUCKET
    
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a pre-signed download URL."""
    bucket = settings.AWS_S3_BUCKET if hasattr(settings, 'AWS_S3_BUCKET') and settings.AWS_S3_BUCKET else settings.S3_BUCKET
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )

def delete_file(key: str):
    bucket = settings.AWS_S3_BUCKET if hasattr(settings, 'AWS_S3_BUCKET') and settings.AWS_S3_BUCKET else settings.S3_BUCKET
    s3_client.delete_object(Bucket=bucket, Key=key)
