from fastapi_app.utils.s3 import upload_resume_to_s3,get_s3_link
from fastapi_app.models.resume import Resume
from fastapi import HTTPException

def save_resume(user_id,file_bytes,original_filename,db):
    try:
        s3_filename = upload_resume_to_s3(file_bytes, original_filename, user_id)
        s3_link = get_s3_link(s3_filename)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to upload resume to S3")
    resume = Resume(user_id=user_id,s3_link=s3_link,original_name=original_filename)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume 

def get_resume_by_user(user_id,db):
    resume = db.query(Resume).filter(Resume.user_id==user_id).first()
    if resume:
        return resume
    else:
        raise HTTPException(status_code=404,detail="No resume found for the given user")
