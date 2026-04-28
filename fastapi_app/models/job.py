from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from fastapi_app.db.database import Base
from datetime import datetime, timezone


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    job_url = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    salary = Column(String, nullable=True)
    source = Column(String, nullable=False)
    emails = Column(JSON, nullable=True)
    scraped_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_seen = Column(Boolean, default=False)
    is_saved = Column(Boolean, default=False)

    user = relationship("User", back_populates="jobs")
