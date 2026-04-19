from fastapi_app.db.database import Base
from sqlalchemy import Column, Integer,String,DateTime,Boolean
from datetime import datetime,timezone
from sqlalchemy.orm import relationship 

class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    email=Column(String,unique=True,index=True,nullable=False)
    hashed_password=Column(String,nullable=False)
    created_at=Column(DateTime,default=lambda: datetime.now(timezone.utc))
    is_active=Column(Boolean,default=True)
    resumes = relationship("Resume", back_populates="user")