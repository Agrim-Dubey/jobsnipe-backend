from sqlalchemy import Column,Integer,String,DateTime,JSON,ForeignKey
from sqlalchemy.orm import relationship
from fastapi_app.db.database import Base
from datetime import datetime,timezone

class Resume(Base):
    __tablename__="resumes"
    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(ForeignKey("users.id"),nullable=False)
    s3_link=Column(String,unique=True,nullable=False)
    original_name=Column(String,nullable=False)
    uploaded_at=Column(DateTime,default=lambda: datetime.now(timezone.utc))
    ai_parsed=Column(JSON,nullable=True)
    user = relationship("User", back_populates="resumes")

