from fastapi import HTTPException
from fastapi_app.schemas.preferences import PreferenceCreate,PreferenceUpdate,PreferenceResponse
from fastapi_app.models.preference import UserPreference

def create_preference(db,user_id,data:PreferenceCreate):
    preference= db.query(UserPreference).filter(UserPreference.user_id==user_id).first()
    if preference:
        raise HTTPException(status_code=400,detail="The preference has already been set")
    userpreference = UserPreference(user_id=user_id, **data.model_dump())
    db.add(userpreference)
    db.commit()
    db.refresh(userpreference)
    return userpreference


def get_preference(db,user_id):
    user_preference = db.query(UserPreference).filter(UserPreference.user_id==user_id).first()
    if not user_preference:
        raise HTTPException(status_code=400,detail="There are no preferences for this user")
    return user_preference

def update_preference(db,user_id,data:PreferenceUpdate):
    user_preference = db.query(UserPreference).filter(UserPreference.user_id==user_id).first()
    if not user_preference:
        raise HTTPException(status_code=400,detail="There are no preferences for this user")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user_preference, field, value)
    db.commit()
    db.refresh(user_preference)
    return user_preference