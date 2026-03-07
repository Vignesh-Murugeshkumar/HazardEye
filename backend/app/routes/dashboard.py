"""
Dashboard API — Aggregated statistics for the HazardEye dashboard.
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text

from app.database import get_db
from app.models.models import Report, User, Verification, ReportStatus, HazardType

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated dashboard statistics:
    - Total reports, users, resolved, pending
    - Reports by hazard type
    - Reports by status
    - Recent reports
    - Severity distribution
    - Resolution rate
    """

    # Total counts
    total_reports = await db.scalar(select(func.count(Report.id)))
    total_users = await db.scalar(select(func.count(User.id)))
    total_resolved = await db.scalar(
        select(func.count(Report.id)).where(Report.status == ReportStatus.resolved)
    )
    total_verified = await db.scalar(
        select(func.count(Report.id)).where(Report.status == ReportStatus.verified)
    )
    total_in_progress = await db.scalar(
        select(func.count(Report.id)).where(Report.status == ReportStatus.in_progress)
    )
    total_pending = await db.scalar(
        select(func.count(Report.id)).where(Report.status == ReportStatus.reported)
    )
    total_verifications = await db.scalar(select(func.count(Verification.id)))

    # Average severity
    avg_severity = await db.scalar(select(func.avg(Report.severity_score)))

    # Total estimated repair cost
    total_cost = await db.scalar(select(func.sum(Report.estimated_repair_cost)))

    # Reports by hazard type
    hazard_query = (
        select(Report.hazard_type, func.count(Report.id).label("count"))
        .group_by(Report.hazard_type)
    )
    hazard_result = await db.execute(hazard_query)
    by_hazard_type = {row.hazard_type: row.count for row in hazard_result}

    # Reports by status
    status_query = (
        select(Report.status, func.count(Report.id).label("count"))
        .group_by(Report.status)
    )
    status_result = await db.execute(status_query)
    by_status = {row.status: row.count for row in status_result}

    # Severity distribution  (low: 1-3, medium: 4-6, high: 7-8, critical: 9-10)
    severity_dist_query = select(
        func.count(case((Report.severity_score <= 3, 1))).label("low"),
        func.count(case((Report.severity_score.between(3.01, 6), 1))).label("medium"),
        func.count(case((Report.severity_score.between(6.01, 8), 1))).label("high"),
        func.count(case((Report.severity_score > 8, 1))).label("critical"),
    )
    sev_result = await db.execute(severity_dist_query)
    sev_row = sev_result.one()

    # Recent 5 reports
    recent_query = (
        select(Report)
        .order_by(Report.created_at.desc())
        .limit(5)
    )
    recent_result = await db.execute(recent_query)
    recent_reports = []
    for report in recent_result.scalars():
        recent_reports.append({
            "id": str(report.id),
            "hazard_type": report.hazard_type.value if hasattr(report.hazard_type, 'value') else report.hazard_type,
            "severity_score": float(report.severity_score) if report.severity_score else 0,
            "status": report.status.value if hasattr(report.status, 'value') else report.status,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "created_at": report.created_at.isoformat() if report.created_at else None,
        })

    resolution_rate = round((total_resolved / total_reports * 100), 1) if total_reports else 0

    return {
        "overview": {
            "total_reports": total_reports or 0,
            "total_users": total_users or 0,
            "total_resolved": total_resolved or 0,
            "total_verified": total_verified or 0,
            "total_in_progress": total_in_progress or 0,
            "total_pending": total_pending or 0,
            "total_verifications": total_verifications or 0,
            "avg_severity": round(float(avg_severity), 1) if avg_severity else 0,
            "total_estimated_cost": float(total_cost) if total_cost else 0,
            "resolution_rate": resolution_rate,
        },
        "by_hazard_type": {
            "pothole": by_hazard_type.get(HazardType.pothole, by_hazard_type.get("pothole", 0)),
            "broken_edge": by_hazard_type.get(HazardType.broken_edge, by_hazard_type.get("broken_edge", 0)),
            "waterlogging": by_hazard_type.get(HazardType.waterlogging, by_hazard_type.get("waterlogging", 0)),
            "missing_manhole": by_hazard_type.get(HazardType.missing_manhole, by_hazard_type.get("missing_manhole", 0)),
        },
        "by_status": {
            "reported": by_status.get(ReportStatus.reported, by_status.get("reported", 0)),
            "verified": by_status.get(ReportStatus.verified, by_status.get("verified", 0)),
            "in_progress": by_status.get(ReportStatus.in_progress, by_status.get("in_progress", 0)),
            "resolved": by_status.get(ReportStatus.resolved, by_status.get("resolved", 0)),
        },
        "severity_distribution": {
            "low": sev_row.low,
            "medium": sev_row.medium,
            "high": sev_row.high,
            "critical": sev_row.critical,
        },
        "recent_reports": recent_reports,
    }
