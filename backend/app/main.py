"""
HazardEye — FastAPI Application Entry Point

Crowdsourced Pothole and Road Hazard Reporting Platform with AI Severity Scoring.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.ml.detector import detector

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    logger.info("Starting HazardEye API...")

    # Load YOLOv8 model
    try:
        detector.load_model(settings.YOLO_MODEL_PATH)
    except Exception as e:
        logger.warning(f"Failed to load YOLO model: {e}. Using simulation mode.")

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    yield

    # Shutdown
    logger.info("Shutting down HazardEye API...")


app = FastAPI(
    title="HazardEye API",
    description=(
        "Crowdsourced Pothole and Road Hazard Reporting Platform with AI Severity Scoring. "
        "Citizens report road hazards with auto GPS tagging, AI classifies hazard type/severity, "
        "and a public map aggregates all reports with predictive hotspot mapping."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow mobile app and web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ============================================
# REGISTER ROUTES
# ============================================

from app.routes.auth import router as auth_router
from app.routes.reports import router as reports_router
from app.routes.verification import router as verification_router
from app.routes.hotspots import router as hotspots_router
from app.routes.constituencies import router as constituencies_router
from app.routes.leaderboard import router as leaderboard_router
from app.routes.weather import router as weather_router

app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(verification_router)
app.include_router(hotspots_router)
app.include_router(constituencies_router)
app.include_router(leaderboard_router)
app.include_router(weather_router)


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "HazardEye API",
        "version": "1.0.0",
        "ml_model_loaded": detector._loaded,
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Welcome to HazardEye API",
        "docs": "/docs",
        "health": "/health",
    }
