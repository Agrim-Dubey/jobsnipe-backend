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

class UserLogin(BaseModel):
    email:str
    password:str

class LoginResponse(BaseModel):
    user_id:str
    email:str
    access_token:str
    refresh_token:str

class GetRefreshTokenResponse(BaseModel):
    access_token:str
    refresh_token:str       
class RefreshTokenRequest(BaseModel):
    refresh_token: str