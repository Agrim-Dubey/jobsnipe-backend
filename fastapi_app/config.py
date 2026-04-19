from pydantic_settings import BaseSettings,SettingsConfigDict



class Settings(BaseSettings):
    SECRET_KEY:str 
    DATABASE_URL:str
    POSTGRES_USER:str
    ACCESS_TOKEN_EXPIRE_MINUTES:int
    REFRESH_TOKEN_EXPIRE_MINUTES:int
    AWS_ACCESS_KEY_ID:str
    AWS_SECRET_ACCESS_KEY1:str
    AWS_S3_BUCKET_NAME:str
    AWS_REGION_NAME:str
    
    model_config = SettingsConfigDict(env_file=".env")
    




settings = Settings()

