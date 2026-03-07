"""
Leaderboard API — Gamified reporting points system with city-level leaderboard.

Shows top reporters by points with filtering by city and time period.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import User, LeaderboardEvent, Report
from app.schemas.schemas import LeaderboardEntry, LeaderboardResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    city: Optional[str] = Query(None),
    period: str = Query("alltime", regex="^(weekly|monthly|alltime)$"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the leaderboard with top users by points."""
    # Determine date filter
    date_filter = ""
    params: dict = {"limit": limit}

    if period == "weekly":
        since = datetime.utcnow() - timedelta(days=7)
        date_filter = "AND le.created_at >= :since"
        params["since"] = since
    elif period == "monthly":
        since = datetime.utcnow() - timedelta(days=30)
        date_filter = "AND le.created_at >= :since"
        params["since"] = since

    city_filter = ""
    if city:
        city_filter = "AND u.city = :city"
        params["city"] = city

    query = text(f"""
        SELECT
            u.id,
            u.name,
            u.city,
            COALESCE(SUM(le.points_awarded), 0) AS total_points,
            COUNT(DISTINCT r.id) AS report_count,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(le.points_awarded), 0) DESC) AS rank
        FROM users u
        LEFT JOIN leaderboard_events le ON le.user_id = u.id {date_filter}
        LEFT JOIN reports r ON r.user_id = u.id
        WHERE u.role = 'citizen' {city_filter}
        GROUP BY u.id, u.name, u.city
        ORDER BY total_points DESC
        LIMIT :limit
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()

    entries = [
        LeaderboardEntry(
            user_id=row[0],
            name=row[1],
            city=row[2],
            points=int(row[3]),
            report_count=int(row[4]),
            rank=int(row[5]),
        )
        for row in rows
    ]

    # Get current user's rank
    user_rank = None
    user_query = text(f"""
        SELECT rank_num, total_points, report_count FROM (
            SELECT
                u.id,
                COALESCE(SUM(le.points_awarded), 0) AS total_points,
                COUNT(DISTINCT r.id) AS report_count,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(le.points_awarded), 0) DESC) AS rank_num
            FROM users u
            LEFT JOIN leaderboard_events le ON le.user_id = u.id {date_filter}
            LEFT JOIN reports r ON r.user_id = u.id
            WHERE u.role = 'citizen' {city_filter}
            GROUP BY u.id
        ) sub
        WHERE sub.id = :user_id
    """)

    user_params = {**params, "user_id": current_user.id}
    user_result = await db.execute(user_query, user_params)
    user_row = user_result.fetchone()

    if user_row:
        user_rank = LeaderboardEntry(
            user_id=current_user.id,  # type: ignore[arg-type]
            name=str(current_user.name),
            city=current_user.city if isinstance(current_user.city, str) else None,
            points=int(user_row[1]),
            report_count=int(user_row[2]),
            rank=int(user_row[0]),
        )

    return LeaderboardResponse(
        entries=entries,
        period=period,
        city=city,
        user_rank=user_rank,
    )


@router.get("/me")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's gamification stats."""
    # Count reports
    report_count = await db.execute(
        select(func.count(Report.id)).where(Report.user_id == current_user.id)
    )

    # Count events by type
    events_query = text("""
        SELECT event_type, SUM(points_awarded) AS total, COUNT(*) AS count
        FROM leaderboard_events
        WHERE user_id = :user_id
        GROUP BY event_type
    """)
    events_result = await db.execute(events_query, {"user_id": current_user.id})
    events = {row[0]: {"points": int(row[1]), "count": int(row[2])} for row in events_result.fetchall()}

    # Determine badges
    badges = []
    total_reports = report_count.scalar() or 0
    total_points = current_user.points if isinstance(current_user.points, int) else (await db.execute(select(User.points).where(User.id == current_user.id))).scalar() or 0
    total_points = int(total_points) if total_points is not None else 0
    if total_reports >= 10:
        badges.append({"name": "Hazard Hunter", "emoji": "🔍", "description": "Submitted 10+ reports"})
    if total_reports >= 50:
        badges.append({"name": "Road Guardian", "emoji": "🛡️", "description": "Submitted 50+ reports"})
    if events.get("verification_cast", {}).get("count", 0) >= 20:
        badges.append({"name": "Verification Hero", "emoji": "✅", "description": "Cast 20+ verification votes"})
    if total_points >= 500:
        badges.append({"name": "Top Reporter", "emoji": "⭐", "description": "500+ total points"})

    return {
        "user_id": str(current_user.id),
        "name": current_user.name,
        "total_points": current_user.points,
        "total_reports": total_reports,
        "event_breakdown": events,
        "badges": badges,
    }
