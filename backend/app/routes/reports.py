"""
Reports API — Submit, list, view, and manage hazard reports.

Handles image upload, AI classification, severity scoring, cost estimation,
and automatic constituency assignment via PostGIS spatial queries.
"""

import os
import uuid
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, cast, Float
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import (
    User, Report, Constituency, UserRole, HazardType, ReportStatus,
    RoadClassification, Verification, VerificationType
)
from app.schemas.schemas import (
    ReportResponse, ReportListResponse, ReportStatusUpdate, ReportCreate,
    ReportStatusEnum, RoadClassEnum, VerificationSummary
)
from app.utils.auth import get_current_user, require_role
from app.ml.detector import detector
from app.ml.severity import compute_severity, get_primary_hazard_type
from app.services.cost_estimator import estimate_repair_cost
from app.services.weather import get_current_weather
from app.services.gamification import on_report_submitted
from app.services.notifications import notify_nearby_citizens_for_verification
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reports", tags=["Reports"])
settings = get_settings()


def _report_to_response(
    report: Any,
    reporter_name: Any = None,
    verification_count: int = 0,
) -> ReportResponse:
    """Convert a Report ORM instance to a ReportResponse schema."""
    resp = ReportResponse.model_validate(report)
    return resp.model_copy(update={
        "reporter_name": reporter_name,
        "verification_count": verification_count,
    })


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    road_classification: str = Form("urban_road"),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new hazard report with image upload.
    Automatically classifies hazard type, computes severity, and estimates repair cost.
    """
    # Validate coordinates
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")

    # Save uploaded image
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(image.filename or "image.jpg")[1] or ".jpg"
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)

    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Run AI detection
    detections = detector.detect(file_path)

    hazard_type = get_primary_hazard_type(detections)
    severity = compute_severity(detections)
    primary = max(detections, key=lambda d: d.confidence) if detections else None

    confidence = primary.confidence if primary else 0.5
    bbox_area_ratio = primary.bbox_area_ratio if primary else 0.15

    # Estimate repair cost
    cost = estimate_repair_cost(
        hazard_type=hazard_type,
        severity_score=severity,
        road_classification=road_classification,
        bbox_area_ratio=bbox_area_ratio,
    )

    # Find constituency via PostGIS
    constituency_id = None
    try:
        constituency_query = text("""
            SELECT id FROM constituencies
            WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
            LIMIT 1
        """)
        result = await db.execute(constituency_query, {"lat": latitude, "lng": longitude})
        row = result.fetchone()
        if row:
            constituency_id = row[0]
    except Exception as e:
        logger.warning(f"Constituency lookup failed: {e}")

    # Fetch weather
    weather = await get_current_weather(latitude, longitude)

    # Create the report
    report = Report(
        user_id=current_user.id,
        image_url=f"/uploads/{file_name}",
        latitude=latitude,
        longitude=longitude,
        location=func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
        hazard_type=hazard_type,
        severity_score=severity,
        estimated_repair_cost=cost,
        road_classification=road_classification,
        constituency_id=constituency_id,
        weather_at_report=weather,
        description=description,
        ai_confidence=confidence,
        bbox_area_ratio=bbox_area_ratio,
    )

    db.add(report)
    await db.flush()
    await db.refresh(report)

    # Award gamification points
    await on_report_submitted(db, current_user.id, report.id)  # type: ignore[arg-type]

    return _report_to_response(report, reporter_name=current_user.name)


@router.get("", response_model=ReportListResponse)
async def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    hazard_type: Optional[str] = Query(None),
    severity_min: Optional[float] = Query(None, ge=1, le=10),
    severity_max: Optional[float] = Query(None, ge=1, le=10),
    min_lat: Optional[float] = Query(None),
    min_lng: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    max_lng: Optional[float] = Query(None),
    constituency_id: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List reports with filters for map viewport, status, type, severity."""
    query = select(Report).options(selectinload(Report.user))
    count_query = select(func.count(Report.id))

    conditions = []

    if status_filter:
        conditions.append(Report.status == status_filter)
    if hazard_type:
        conditions.append(Report.hazard_type == hazard_type)
    if severity_min is not None:
        conditions.append(Report.severity_score >= severity_min)
    if severity_max is not None:
        conditions.append(Report.severity_score <= severity_max)
    if constituency_id:
        conditions.append(Report.constituency_id == constituency_id)

    # Bounding box filter
    if all(v is not None for v in [min_lat, min_lng, max_lat, max_lng]):
        bbox_condition = text("""
            ST_Contains(
                ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326),
                location
            )
        """).bindparams(
            min_lat=min_lat, min_lng=min_lng,
            max_lat=max_lat, max_lng=max_lng,
        )
        conditions.append(bbox_condition)

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate and order
    offset = (page - 1) * page_size
    query = query.order_by(Report.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    reports = result.scalars().all()

    return ReportListResponse(
        reports=[
            _report_to_response(r, reporter_name=r.user.name if r.user else None)
            for r in reports
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single report by ID."""
    result = await db.execute(
        select(Report).options(selectinload(Report.user)).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Count verifications
    verif_count = await db.execute(
        select(func.count(Verification.id)).where(Verification.report_id == report.id)
    )

    return _report_to_response(
        report,
        reporter_name=report.user.name if report.user else None,
        verification_count=verif_count.scalar() or 0,
    )


@router.patch("/{report_id}/status", response_model=ReportResponse)
async def update_report_status(
    report_id: str,
    data: ReportStatusUpdate,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update report status (authority/admin only).
    When marking as resolved, status becomes 'resolved_unverified' and triggers
    push notifications to nearby citizens.
    """
    result = await db.execute(
        select(Report).options(selectinload(Report.user)).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # When authority marks as "resolved", set to "resolved_unverified" first
    new_status = data.status
    if new_status == ReportStatus.resolved:
        new_status = ReportStatus.resolved_unverified

    report.status = new_status  # type: ignore[assignment]

    if new_status in [ReportStatus.resolved, ReportStatus.resolved_unverified]:
        from datetime import datetime
        report.resolved_at = datetime.utcnow()  # type: ignore[assignment]

    db.add(report)
    await db.flush()
    await db.refresh(report)

    # Trigger push notifications for verification
    if new_status == ReportStatus.resolved_unverified:
        try:
            await notify_nearby_citizens_for_verification(
                db=db,
                report_id=str(report.id),
                latitude=report.latitude,  # type: ignore[arg-type]
                longitude=report.longitude,  # type: ignore[arg-type]
            )
        except Exception as e:
            logger.warning(f"Failed to send verification notifications: {e}")

    return _report_to_response(report, reporter_name=report.user.name if report.user else None)
