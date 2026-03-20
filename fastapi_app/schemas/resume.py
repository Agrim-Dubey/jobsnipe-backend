from pydantic import BaseModel,ConfigDict
from datetime import datetime 

class ResumeUploadResponse(BaseModel):
    id:int
    user_id:int
    s3_link:str
    original_name:str
    uploaded_at:datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeResponse(BaseModel):
    id:int
    user_id:int
    s3_link:str
    original_name:str
    uploaded_at:datetime
    ai_parsed:dict | None

    model_config = ConfigDict(from_attributes=True) 