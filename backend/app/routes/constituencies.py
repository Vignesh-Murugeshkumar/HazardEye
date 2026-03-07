"""
Constituencies API — MLA and Ward Councillor Accountability Dashboard.

Provides constituency data, aggregated statistics, and accountability metrics
for public transparency. Shows unresolved counts, average resolution times,
and trends per constituency.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, case

from app.database import get_db
from app.models.models import Constituency, Report, ReportStatus
from app.schemas.schemas import ConstituencyResponse, ConstituencyStatsResponse

router = APIRouter(prefix="/api/constituencies", tags=["Constituencies"])


@router.get("")
async def list_constituencies(
    city: Optional[str] = Query(None),
    sort_by: str = Query("unresolved", regex="^(unresolved|resolution_time|name)$"),
    db: AsyncSession = Depends(get_db),
):
    """List all constituencies with summary statistics, sorted by accountability metrics."""

    # Build ORDER BY safely — cannot parameterize ORDER BY in SQL
    order_clauses = {
        "unresolved": "COUNT(r.id) FILTER (WHERE r.status NOT IN ('resolved')) DESC NULLS LAST",
        "resolution_time": "AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))) DESC NULLS LAST",
        "name": "c.name ASC",
    }
    order_by = order_clauses.get(sort_by, order_clauses["unresolved"])

    query = text(f"""
        SELECT
            c.id,
            c.name,
            c.type,
            c.representative_name,
            c.city,
            c.created_at,
            COUNT(r.id) AS total_reports,
            COUNT(r.id) FILTER (WHERE r.status NOT IN ('resolved')) AS unresolved_count,
            COUNT(r.id) FILTER (WHERE r.status = 'resolved') AS resolved_count,
            AVG(
                EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 86400.0
            ) FILTER (WHERE r.resolved_at IS NOT NULL) AS avg_resolution_days,
            COALESCE(SUM(r.estimated_repair_cost) FILTER (WHERE r.status NOT IN ('resolved')), 0) AS total_cost
        FROM constituencies c
        LEFT JOIN reports r ON r.constituency_id = c.id
        WHERE (CAST(:city AS TEXT) IS NULL OR c.city = :city)
        GROUP BY c.id, c.name, c.type, c.representative_name, c.city, c.created_at
        ORDER BY {order_by}
    """)

    result = await db.execute(query, {"city": city})
    rows = result.fetchall()

    constituencies = []
    for row in rows:
        total = row[6] or 0
        resolved = row[8] or 0
        unresolved = row[7] or 0
        resolution_rate = (resolved / total * 100) if total > 0 else 0

        constituencies.append({
            "constituency": {
                "id": str(row[0]),
                "name": row[1],
                "type": row[2],
                "representative_name": row[3],
                "city": row[4],
                "created_at": str(row[5]),
            },
            "total_reports": total,
            "unresolved_count": unresolved,
            "resolved_count": resolved,
            "avg_resolution_days": round(float(row[9]), 1) if row[9] else None,
            "resolution_rate": round(resolution_rate, 1),
            "total_estimated_cost": float(row[10]) if row[10] else 0,
        })

    return {"constituencies": constituencies, "total": len(constituencies)}


@router.get("/{constituency_id}")
async def get_constituency(
    constituency_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single constituency with detailed stats."""
    result = await db.execute(
        select(Constituency).where(Constituency.id == constituency_id)
    )
    constituency = result.scalar_one_or_none()

    if not constituency:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Constituency not found")

    return ConstituencyResponse.model_validate(constituency)


@router.get("/{constituency_id}/stats")
async def get_constituency_stats(
    constituency_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed statistics for a constituency."""
    # Get constituency
    const_result = await db.execute(
        select(Constituency).where(Constituency.id == constituency_id)
    )
    constituency = const_result.scalar_one_or_none()
    if not constituency:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Constituency not found")

    # Aggregate stats
    stats_query = text("""
        SELECT
            COUNT(*) AS total_reports,
            COUNT(*) FILTER (WHERE status NOT IN ('resolved')) AS unresolved_count,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
            AVG(
                EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400.0
            ) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_days,
            COALESCE(SUM(estimated_repair_cost) FILTER (WHERE status NOT IN ('resolved')), 0) AS total_cost,
            COUNT(*) FILTER (WHERE hazard_type = 'pothole') AS potholes,
            COUNT(*) FILTER (WHERE hazard_type = 'broken_edge') AS broken_edges,
            COUNT(*) FILTER (WHERE hazard_type = 'waterlogging') AS waterlogging,
            COUNT(*) FILTER (WHERE hazard_type = 'missing_manhole') AS missing_manholes,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30_days,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') AS prev_30_days
        FROM reports
        WHERE constituency_id = :cid
    """)

    result = await db.execute(stats_query, {"cid": constituency_id})
    row = result.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No reports found for this constituency")

    total = row[0] or 0
    resolved = row[2] or 0
    last_30 = row[9] or 0
    prev_30 = row[10] or 0

    # Determine trend
    if last_30 > prev_30 * 1.2:
        trend = "worsening"
    elif last_30 < prev_30 * 0.8:
        trend = "improving"
    else:
        trend = "stable"

    return {
        "constituency": ConstituencyResponse.model_validate(constituency),
        "total_reports": total,
        "unresolved_count": row[1] or 0,
        "resolved_count": resolved,
        "avg_resolution_days": round(float(row[3]), 1) if row[3] else None,
        "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 1),
        "total_estimated_cost": float(row[4]),
        "hazard_breakdown": {
            "pothole": row[5] or 0,
            "broken_edge": row[6] or 0,
            "waterlogging": row[7] or 0,
            "missing_manhole": row[8] or 0,
        },
        "trend": trend,
        "last_30_days_reports": last_30,
        "prev_30_days_reports": prev_30,
    }
