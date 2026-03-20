from sqlalchemy import create_engine
from fastapi_app.config import settings
from sqlalchemy.orm import declarative_base,sessionmaker

engine=create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine,autocommit=False,autoflush = False,future=True)

Base = declarative_base()

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()
