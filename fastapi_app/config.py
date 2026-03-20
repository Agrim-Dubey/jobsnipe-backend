from pydantic_settings import BaseSettings,SettingsConfigDict



class Settings(BaseSettings):
    SECRET_KEY:str 
    DATABASE_URL:str
    POSTGRES_USER:str
    ACCESS_TOKEN_EXPIRE_MINUTES:int
    REFRESH_TOKEN_EXPIRE_MINUTES:int

    model_config = SettingsConfigDict(env_file=".env")
    




settings = Settings()

