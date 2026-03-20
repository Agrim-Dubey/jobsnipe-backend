from pydantic import BaseModel,ConfigDict
from datetime import datetime 

class UserCreate(BaseModel):
    email:str
    password:str

class UserResponse(BaseModel):
    id:int
    email:str
    created_at:datetime
    is_active:bool

    model_config = ConfigDict(from_attributes=True)


