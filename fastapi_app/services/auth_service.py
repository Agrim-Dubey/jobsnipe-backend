from fastapi_app.db.database import get_db
from fastapi import Depends
from sqlalchemy.orm import Session 
from fastapi_app.models.users import User
import re


def check_user_exists(email,db:Session):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user 
    else:
        return None
    
def check_password_regex(password):
    regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if re.match(regex, password):
        return password
    else:
        return None
