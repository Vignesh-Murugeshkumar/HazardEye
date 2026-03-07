"""
Weather Service — WeatherAPI.com integration

Fetches current weather conditions for a given location.
Includes in-memory caching to avoid API rate limits.
"""

import time
import logging
from typing import Optional, Dict, Tuple

import httpx

from app.config import get_settings
from app.schemas.schemas import WeatherInfo

logger = logging.getLogger(__name__)
settings = get_settings()

# Simple in-memory cache: key = (lat_rounded, lng_rounded) -> (weather_data, timestamp)
_weather_cache: Dict[Tuple[float, float], Tuple[dict, float]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes


def _cache_key(lat: float, lng: float) -> Tuple[float, float]:
    """Round to 2 decimal places (~1km resolution) for cache grouping."""
    return (round(lat, 2), round(lng, 2))


async def get_current_weather(lat: float, lng: float) -> Optional[dict]:
    """
    Fetch current weather from WeatherAPI.com for given coordinates.
    Returns a dict matching WeatherInfo schema, or None on failure.
    """
    if not settings.WEATHER_API_KEY:
        return _simulated_weather(lat, lng)

    key = _cache_key(lat, lng)
    now = time.time()

    # Check cache
    if key in _weather_cache:
        cached_data, cached_at = _weather_cache[key]
        if now - cached_at < CACHE_TTL_SECONDS:
            return cached_data

    try:
        url = "https://api.weatherapi.com/v1/current.json"
        params = {
            "key": settings.WEATHER_API_KEY,
            "q": f"{lat},{lng}",
            "aqi": "no",
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        current = data.get("current", {})
        condition = current.get("condition", {})

        weather = {
            "temperature_c": current.get("temp_c", 0),
            "condition": condition.get("text", "Unknown"),
            "humidity": current.get("humidity", 0),
            "wind_kph": current.get("wind_kph", 0),
            "is_raining": current.get("precip_mm", 0) > 0.5,
            "rain_mm": current.get("precip_mm", 0),
            "flood_risk": current.get("precip_mm", 0) > 20,
        }

        # Cache the result
        _weather_cache[key] = (weather, now)
        return weather

    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return _simulated_weather(lat, lng)


def _simulated_weather(lat: float, lng: float) -> dict:
    """Simulated weather for development or when API key is missing."""
    import random
    random.seed(int(lat * 100 + lng * 10))

    conditions = ["Sunny", "Partly cloudy", "Cloudy", "Light rain", "Heavy rain", "Thunderstorm", "Mist"]
    condition = random.choice(conditions)
    rain_mm = random.uniform(0, 30) if "rain" in condition.lower() else 0

    return {
        "temperature_c": round(random.uniform(20, 40), 1),
        "condition": condition,
        "humidity": random.randint(30, 95),
        "wind_kph": round(random.uniform(5, 40), 1),
        "is_raining": rain_mm > 0.5,
        "rain_mm": round(rain_mm, 1),
        "flood_risk": rain_mm > 20,
    }


async def get_weather_for_bbox(
    min_lat: float, min_lng: float, max_lat: float, max_lng: float, grid_size: int = 3
) -> list:
    """
    Get weather data grid for a map bounding box.
    Returns weather at grid_size x grid_size points within the bbox.
    """
    points = []
    lat_step = (max_lat - min_lat) / max(grid_size - 1, 1)
    lng_step = (max_lng - min_lng) / max(grid_size - 1, 1)

    for i in range(grid_size):
        for j in range(grid_size):
            lat = min_lat + i * lat_step
            lng = min_lng + j * lng_step
            weather = await get_current_weather(lat, lng)
            if weather:
                points.append({
                    "latitude": round(lat, 6),
                    "longitude": round(lng, 6),
                    "weather": weather,
                })

    return points
