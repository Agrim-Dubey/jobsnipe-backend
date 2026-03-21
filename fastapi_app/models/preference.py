import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import timezone


class RemotePreference(enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class ExperienceLevel(enum.Enum):
    fresher = "fresher"
    mid = "mid"
    senior = "senior"


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    desired_roles = Column(ARRAY(String), nullable=False)
    preferred_locations = Column(ARRAY(String), nullable=False)
    remote_preference = Column(Enum(RemotePreference), nullable=False)
    experience_level = Column(Enum(ExperienceLevel), nullable=False)
    min_salary = Column(Integer, nullable=True)
    max_salary = Column(Integer, nullable=True)
    skills = Column(ARRAY(String), nullable=False)
    created_at = Column(DateTime, default=lambda:datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda:datetime.now(timezone.utc), onupdate=lambda:datetime.now(timezone.utc))
    user = relationship("User", back_populates="preference")
