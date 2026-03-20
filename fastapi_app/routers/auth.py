from fastapi import APIRouter,Depends
from fastapi import HTTPException
from fastapi_app.schemas.user import UserCreate,UserResponse
from fastapi_app.db.database import get_db 
from sqlalchemy.orm import Session 
from fastapi_app.services.auth_service import check_user_exists,check_password_regex
from fastapi_app.security import hash_password
from fastapi_app.models.users import User

router = APIRouter()

@router.post("/register",response_model=UserResponse)
def register_user(user:UserCreate,db:Session=Depends(get_db)):
    user_real =check_user_exists(user.email,db)
    if user_real :
        raise HTTPException(status_code=400,detail="User with this email already exists")
    password = check_password_regex(user.password)
    if password:
        password = hash_password(password)
    else:
        raise HTTPException(status_code=400,detail="password must have atleast 8 digits, one uppercase letter and one lowercase letter")
    new_user = User(email=user.email,hashed_password =password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user



