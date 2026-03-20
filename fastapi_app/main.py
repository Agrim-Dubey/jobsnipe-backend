from fastapi import FastAPI
from fastapi_app.routers.auth import router as auth_router
from fastapi_app.routers.resume import router as resume_router

app = FastAPI()

@app.get("/")
def read_root():
    return {"message":"welcome to the jobsnipe backend"}

@app.get("/health")
def health_route():
    return {"status": "okay the status is fine"}

app.include_router(auth_router,prefix="/auth",tags=["auth"])
app.include_router(resume_router,prefix="/resume",tags=["resume"])