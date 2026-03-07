"""
Hotspots API — Predictive hazard hotspot mapping.

Returns predicted risk zones as GeoJSON polygons for map overlay.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import HotspotPrediction, UserRole
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/hotspots", tags=["Hotspots"])


@router.get("")
async def get_hotspots(
    city: Optional[str] = Query(None),
    min_lat: Optional[float] = Query(None),
    min_lng: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    max_lng: Optional[float] = Query(None),
    min_risk: float = Query(0.3, ge=0, le=1),
    db: AsyncSession = Depends(get_db),
):
    """
    Get predicted hazard hotspot zones as GeoJSON.
    Returns zones predicted for the next 30 days with risk ≥ min_risk.
    """
    today = datetime.utcnow().date()
    future = today + timedelta(days=30)

    query = text("""
        SELECT
            id,
            ST_AsGeoJSON(zone) as zone_geojson,
            risk_score,
            predicted_for_date,
            city,
            model_version,
            features
        FROM hotspot_predictions
        WHERE risk_score >= :min_risk
          AND predicted_for_date >= :today
          AND predicted_for_date <= :future
    """)
    params = {"min_risk": min_risk, "today": today, "future": future}

    if city:
        query = text("""
            SELECT
                id,
                ST_AsGeoJSON(zone) as zone_geojson,
                risk_score,
                predicted_for_date,
                city,
                model_version,
                features
            FROM hotspot_predictions
            WHERE risk_score >= :min_risk
              AND predicted_for_date >= :today
              AND predicted_for_date <= :future
              AND city = :city
        """)
        params["city"] = city

    if all(v is not None for v in [min_lat, min_lng, max_lat, max_lng]):
        query = text("""
            SELECT
                id,
                ST_AsGeoJSON(zone) as zone_geojson,
                risk_score,
                predicted_for_date,
                city,
                model_version,
                features
            FROM hotspot_predictions
            WHERE risk_score >= :min_risk
              AND predicted_for_date >= :today
              AND predicted_for_date <= :future
              AND ST_Intersects(
                  zone,
                  ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
              )
        """)
        params.update({
            "min_lat": min_lat, "min_lng": min_lng,
            "max_lat": max_lat, "max_lng": max_lng,
        })

    result = await db.execute(query, params)
    rows = result.fetchall()

    import json
    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row[1]),
            "properties": {
                "id": str(row[0]),
                "risk_score": float(row[2]),
                "predicted_for_date": str(row[3]),
                "city": row[4],
                "model_version": row[5],
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "total_zones": len(features),
            "date_range": {"from": str(today), "to": str(future)},
            "min_risk_threshold": min_risk,
        }
    }


@router.post("/refresh")
async def refresh_hotspots(
    current_user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: trigger re-prediction of hotspot zones."""
    # In production, this would trigger the ML model to re-run
    # For now, return a status message
    return {
        "message": "Hotspot prediction refresh triggered",
        "status": "queued",
    }
