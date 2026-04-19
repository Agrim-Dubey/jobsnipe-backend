from pydantic_settings import BaseSettings,SettingsConfigDict



class Settings(BaseSettings):
    SECRET_KEY:str 
    DATABASE_URL:str
    POSTGRES_USER:str
    ACCESS_TOKEN_EXPIRE_MINUTES:int
    REFRESH_TOKEN_EXPIRE_MINUTES:int
    AWS_ACCESS_KEY_ID:str | None = None
    AWS_SECRET_ACCESS_KEY:str | None = None
    AWS_S3_BUCKET_NAME:str | None = None
    AWS_REGION_NAME:str | None = None
    
    model_config = SettingsConfigDict(env_file=".env",extra="ignore")
    




settings = Settings()

