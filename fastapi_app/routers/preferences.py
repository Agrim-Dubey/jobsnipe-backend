from fastapi import APIRouter,Depends,HTTPException
from fastapi_app.db.database import get_db
from sqlalchemy.orm import Session
from fastapi_app.schemas.preferences import PreferenceResponse,PreferenceCreate,PreferenceUpdate
from fastapi_app.dependencies.auth import get_current_user
from fastapi_app.services.preference_services import get_preference,create_preference,update_preference

router = APIRouter()

@router.get("/preferences/me",response_model=PreferenceResponse)
def get_my_preference(user= Depends(get_current_user),db:Session=Depends(get_db)):
    user_preference = get_preference(db,user.user_id)
    if not user_preference:
        raise HTTPException(status_code=400,detail="No preferences for the current user found.")
    return user_preference

@router.post("/preferences",response_model=PreferenceResponse)
def user_preferences(data:PreferenceCreate,user= Depends(get_current_user),db:Session=Depends(get_db)):
    user_preference = create_preference(db,user.user_id,data)
    return user_preference

@router.patch("/preferences",response_model=PreferenceResponse)
def update_preferences(data:PreferenceUpdate,user= Depends(get_current_user),db:Session=Depends(get_db)):
    user_preference = update_preference(db,user.user_id,data) 
    return user_preference
