"""
Weather API — Weather correlation layer.

Overlays real-time weather data on the hazard map to show which reported hazards
are in areas with active rainfall or flood risk.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.services.weather import get_current_weather, get_weather_for_bbox

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get("/current")
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """Get current weather for a specific location."""
    weather = await get_current_weather(lat, lng)
    return {"latitude": lat, "longitude": lng, "weather": weather}


@router.get("/overlay")
async def get_weather_overlay(
    min_lat: float = Query(..., ge=-90, le=90),
    min_lng: float = Query(..., ge=-180, le=180),
    max_lat: float = Query(..., ge=-90, le=90),
    max_lng: float = Query(..., ge=-180, le=180),
    db: AsyncSession = Depends(get_db),
):
    """
    Get weather overlay for a map bounding box.
    Returns weather conditions at grid points and counts of affected hazard reports.
    """
    weather_points = await get_weather_for_bbox(min_lat, min_lng, max_lat, max_lng, grid_size=3)

    # Count reports in areas with active rain
    rain_report_count = 0
    try:
        result = await db.execute(
            text("""
                SELECT COUNT(*)
                FROM reports
                WHERE status NOT IN ('resolved')
                  AND ST_Contains(
                      ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326),
                      location
                  )
            """),
            {
                "min_lat": min_lat, "min_lng": min_lng,
                "max_lat": max_lat, "max_lng": max_lng,
            }
        )
        rain_report_count = result.scalar() or 0
    except Exception:
        pass

    # Determine overall risk for the area
    any_rain = any(p.get("weather", {}).get("is_raining", False) for p in weather_points)
    any_flood = any(p.get("weather", {}).get("flood_risk", False) for p in weather_points)

    return {
        "weather_grid": weather_points,
        "summary": {
            "is_raining": any_rain,
            "flood_risk": any_flood,
            "active_reports_in_area": rain_report_count,
            "priority_boost": any_rain or any_flood,
        }
    }


@router.get("/alerts")
async def get_weather_alerts(
    city: str = Query(...),
):
    """Get active weather alerts for a city."""
    # Map city to approximate coordinates for weather lookup
    CITY_COORDS = {
        "mumbai": (19.076, 72.8777),
        "delhi": (28.6139, 77.209),
        "bangalore": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
        "hyderabad": (17.385, 78.4867),
        "pune": (18.5204, 73.8567),
        "ahmedabad": (23.0225, 72.5714),
        "jaipur": (26.9124, 75.7873),
        "lucknow": (26.8467, 80.9462),
    }

    coords = CITY_COORDS.get(city.lower(), (20.5937, 78.9629))  # Default: center of India
    weather = await get_current_weather(coords[0], coords[1])

    alerts = []
    if weather:
        if weather.get("is_raining"):
            alerts.append({
                "type": "rainfall",
                "severity": "high" if weather.get("rain_mm", 0) > 10 else "moderate",
                "message": f"Active rainfall in {city}: {weather.get('rain_mm', 0)}mm. Reported hazards may worsen.",
            })
        if weather.get("flood_risk"):
            alerts.append({
                "type": "flood_risk",
                "severity": "critical",
                "message": f"Flood risk detected in {city}. Road hazards should be treated as high priority.",
            })

    return {"city": city, "alerts": alerts, "current_weather": weather}
