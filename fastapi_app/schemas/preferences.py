from pydantic import BaseModel,ConfigDict
from typing import List,Optional
from fastapi_app.models.preference import RemotePreference,ExperienceLevel
from datetime import datetime 

class PreferenceCreate(BaseModel):
    desired_roles: List[str]
    preferred_locations: List[str]
    remote_preference:RemotePreference
    experience_level:ExperienceLevel
    min_salary:Optional[int]=None
    max_salary:Optional[int]=None
    skills:List[str]

class PreferenceUpdate(BaseModel):
    desired_roles:Optional[List[str]]=None
    preferred_locations: Optional[List[str]]=None
    remote_preference:Optional[RemotePreference]=None
    experience_level:Optional[ExperienceLevel]=None
    min_salary:Optional[int]=None
    max_salary:Optional[int]=None
    skills:Optional[List[str]]=None

class PreferenceResponse(BaseModel):
    id:int
    user_id:int
    desired_roles: List[str]
    preferred_locations: List[str]
    remote_preference:RemotePreference
    experience_level:ExperienceLevel
    min_salary:Optional[int]=None
    max_salary:Optional[int]=None
    skills:List[str]
    created_at:datetime
    updated_at:datetime

    model_config = ConfigDict(from_attributes=True)
