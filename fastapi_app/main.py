from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi_app.routers.auth import router as auth_router
from fastapi_app.routers.preferences import router as preferences_router
from fastapi_app.routers.jobs import router as jobs_router
import os

app = FastAPI(
    title="JobSnipe",
    description="Mass job crawler — scrapes HN, Reddit, RemoteOK, Arbeitnow and more",
    version="2.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_route():
    return {"status": "ok", "service": "jobsnipe"}


# API routes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(preferences_router, prefix="/api/preferences", tags=["preferences"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["jobs"])

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the SPA frontend for any non-API route."""
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))