from fastapi import APIRouter,Depends,HTTPException,UploadFile,File
from sqlalchemy.orm import Session
from fastapi_app.db.database import get_db
from fastapi_app.dependencies.auth import get_current_user
from fastapi_app.services.resume_service import save_resume,get_resume_by_user
from fastapi_app.schemas.resume import ResumeUploadResponse,ResumeResponse




router=APIRouter()


@router.post("/upload",response_model=ResumeUploadResponse)
def upload_user_resume(file:UploadFile=File(...),current_user=Depends(get_current_user),db:Session=Depends(get_db)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400,detail="Only pdfs are allowed as resumes")
    file_bytes=file.file.read()
    if len(file_bytes) > 5*1024*1024:
        raise HTTPException(status_code=400,detail="File size exceeds 5mb limit")
    resume= save_resume(current_user.id,file_bytes,file.filename,db)
    return resume 

@router.get("/me",response_model=ResumeResponse)
def get_user_resume(current_user=Depends(get_current_user),db:Session=Depends(get_db)):
    resume = get_resume_by_user(current_user.id,db)
    return resume 



