"""
Quick test to verify AWS S3 connection and configuration
"""
import sys
from config import settings
from services.s3 import upload_file, s3_client
from botocore.exceptions import ClientError

def test_s3_config():
    print("="*60)
    print("AWS S3 Configuration Test")
    print("="*60)
    
    # Check configuration
    print("\n1. Configuration Check:")
    print(f"   AWS_ACCESS_KEY_ID: {settings.AWS_ACCESS_KEY_ID[:10]}..." if settings.AWS_ACCESS_KEY_ID else "   ❌ Not set")
    print(f"   AWS_SECRET_ACCESS_KEY: {settings.AWS_SECRET_ACCESS_KEY[:10]}..." if settings.AWS_SECRET_ACCESS_KEY else "   ❌ Not set")
    print(f"   AWS_REGION: {settings.AWS_REGION}")
    
    # Use AWS_S3_BUCKET if available
    bucket = settings.AWS_S3_BUCKET if hasattr(settings, 'AWS_S3_BUCKET') and settings.AWS_S3_BUCKET else settings.S3_BUCKET
    print(f"   S3_BUCKET: {bucket}")
    
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        print("\n❌ AWS credentials not configured!")
        print("   Please check your .env file")
        return False
    
    # Test S3 connection
    print("\n2. S3 Connection Test:")
    try:
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            MaxKeys=1
        )
        print(f"   ✅ Successfully connected to bucket: {bucket}")
        print(f"   Bucket exists and is accessible")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print(f"   ❌ Bucket '{bucket}' does not exist")
        elif error_code == 'AccessDenied':
            print(f"   ❌ Access denied to bucket '{bucket}'")
        elif error_code == 'InvalidAccessKeyId':
            print(f"   ❌ Invalid AWS Access Key ID")
        elif error_code == 'SignatureDoesNotMatch':
            print(f"   ❌ Invalid AWS Secret Access Key")
        else:
            print(f"   ❌ Error: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False
    
    # Test file upload
    print("\n3. File Upload Test:")
    try:
        test_content = b"Test file content for S3 upload verification"
        test_filename = "test_upload.txt"
        
        url = upload_file(test_content, test_filename, folder="test")
        print(f"   ✅ File uploaded successfully!")
        print(f"   URL: {url}")
        
        # Verify URL format
        expected_url_start = f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/"
        if url.startswith(expected_url_start):
            print(f"   ✅ URL format is correct")
        else:
            print(f"   ⚠️  URL format unexpected")
            print(f"   Expected: {expected_url_start}...")
            print(f"   Got: {url}")
        
    except Exception as e:
        print(f"   ❌ Upload failed: {e}")
        return False
    
    print("\n" + "="*60)
    print("✅ All S3 tests passed!")
    print("="*60)
    return True

if __name__ == "__main__":
    success = test_s3_config()
    sys.exit(0 if success else 1)
