"""
Gamification Service — Points System

Awards points to users for contributing to the platform:
- Report submitted: +5 points
- Report verified by ≥2 users (upvoted): +15 points
- Report confirmed as resolved: +25 points
- Verification vote cast: +3 points

All point awards are idempotent (no double-awarding).
"""

import logging
from uuid import UUID
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.models import User, LeaderboardEvent, LeaderboardEventType

logger = logging.getLogger(__name__)

# Points configuration
POINTS_REPORT_SUBMITTED = 5
POINTS_REPORT_VERIFIED = 15
POINTS_REPORT_RESOLVED = 25
POINTS_VERIFICATION_CAST = 3


async def award_points(
    db: AsyncSession,
    user_id: UUID,
    report_id: UUID,
    event_type: LeaderboardEventType,
    points: int,
) -> bool:
    """
    Award points to a user for a specific event.
    Returns True if points were awarded, False if already awarded (idempotent).
    """
    # Check for existing award (idempotent)
    existing = await db.execute(
        select(LeaderboardEvent).where(
            LeaderboardEvent.user_id == user_id,
            LeaderboardEvent.report_id == report_id,
            LeaderboardEvent.event_type == event_type,
        )
    )
    if existing.scalar_one_or_none():
        return False

    # Create leaderboard event
    event = LeaderboardEvent(
        user_id=user_id,
        report_id=report_id,
        event_type=event_type,
        points_awarded=points,
    )
    db.add(event)

    # Update user points
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(points=(User.points + points))
    )

    logger.info(f"Awarded {points} points to user {user_id} for {event_type.value}")
    return True


async def on_report_submitted(db: AsyncSession, user_id: UUID, report_id: UUID):
    """Award points when a user submits a report."""
    await award_points(
        db, user_id, report_id,
        LeaderboardEventType.report_submitted,
        POINTS_REPORT_SUBMITTED,
    )


async def on_report_verified(db: AsyncSession, reporter_id: UUID, report_id: UUID):
    """Award points to the reporter when their report gets verified by 2+ users."""
    await award_points(
        db, reporter_id, report_id,
        LeaderboardEventType.report_verified,
        POINTS_REPORT_VERIFIED,
    )


async def on_report_resolved(db: AsyncSession, reporter_id: UUID, report_id: UUID):
    """Award points to the reporter when their report is confirmed resolved."""
    await award_points(
        db, reporter_id, report_id,
        LeaderboardEventType.report_resolved,
        POINTS_REPORT_RESOLVED,
    )


async def on_verification_cast(db: AsyncSession, voter_id: UUID, report_id: UUID):
    """Award points when a user casts a verification vote."""
    await award_points(
        db, voter_id, report_id,
        LeaderboardEventType.verification_cast,
        POINTS_VERIFICATION_CAST,
    )
