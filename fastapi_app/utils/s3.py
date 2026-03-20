import boto3
from botocore.exceptions import ClientError
from fastapi_app.config import settings 
import uuid
from fastapi import HTTPException


s3_client = boto3.client("s3",aws_access_key_id=settings.AWS_ACCESS_KEY_ID,aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY1,region_name=settings.AWS_REGION_NAME)

def upload_resume_to_s3(file_bytes,original_filename,user_id):
    file_extension=original_filename.split(".")[-1]
    unique_filename=f"resumes/{user_id}/{uuid.uuid4()}.{file_extension}"
    try:
        s3_client.put_object(Bucket=settings.AWS_S3_BUCKET_NAME,Key=unique_filename,Body=file_bytes,ContentType="application/pdf")
        return unique_filename
    except ClientError as e:
        raise Exception(f"Failed to upload resume: {e}")
    
    
def get_s3_link(filename):
    return f"https://{settings.AWS_S3_BUCKET_NAME}.s3.{settings.AWS_REGION_NAME}.amazonaws.com/{filename}"


