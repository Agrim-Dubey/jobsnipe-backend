from fastapi import APIRouter,Depends
from fastapi import HTTPException
from fastapi_app.schemas.user import UserCreate,UserResponse,LoginResponse,UserLogin
from fastapi_app.db.database import get_db 
from sqlalchemy.orm import Session 
from fastapi_app.services.auth_service import check_user_exists,check_password_regex,check_user
from fastapi_app.security import hash_password,generate_access_token,generate_refresh_token
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


@router.post("/login",response_model=LoginResponse)
def user_login(user:UserLogin,db:Session=Depends(get_db)):
    user_real = check_user(user.email,user.password,db)
    if not user_real:
        raise HTTPException(status_code=400,detail="Invalid User Credentials")
    else:
        access_token= generate_access_token(user_real.id)
        refresh_token = generate_refresh_token(user_real.id)
        return {"user_id": user_real.id, "email": user_real.email,"access_token":access_token,"refresh_token":refresh_token,"token_type":"bearer"}



