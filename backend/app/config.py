from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hazardeye:hazardeye_pass@localhost:5432/hazardeye"

    # JWT
    JWT_SECRET: str = "change-me-to-a-random-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    # WeatherAPI.com
    WEATHER_API_KEY: str = ""

    # Authority invite code
    AUTHORITY_INVITE_CODE: str = "HAZARD_AUTH_2026"

    # Upload directory
    UPLOAD_DIR: str = "./uploads"

    # ML model paths
    YOLO_MODEL_PATH: str = "./ml/models/hazardeye_yolov8n.pt"
    HOTSPOT_MODEL_PATH: str = "./ml/models/hotspot_model.joblib"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
