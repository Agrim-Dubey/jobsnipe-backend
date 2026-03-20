from passlib.context import CryptContext 
from fastapi_app.config import settings 
from datetime import datetime,timedelta,timezone
from jose import JWTError,jwt


pwd_context = CryptContext(schemes=["bcrypt"],deprecated="auto")
SECRET_KEY =settings.SECRET_KEY
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = settings.REFRESH_TOKEN_EXPIRE_MINUTES   

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(plain_password,hashed_password):
    return pwd_context.verify(plain_password,hashed_password)

def generate_access_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"user_id": user_id, "exp": expire} 
    return jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)

def generate_refresh_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode = {"user_id": user_id, "exp": expire} 
    return jwt.encode(to_encode,SECRET_KEY,algorhtm=ALGORITHM)   





