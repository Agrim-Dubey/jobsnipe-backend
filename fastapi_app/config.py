from pydantic_settings import BaseSettings,SettingsConfigDict



class Settings(BaseSettings):
    SECRET_KEY:str 
    DATABASE_URL:str
    POSTGRES_USER:str

    model_config = SettingsConfigDict(env_file=".env")
    




settings = Settings()

