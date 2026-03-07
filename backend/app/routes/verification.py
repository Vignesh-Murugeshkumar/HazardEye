"""
Verification API — Upvote reports and verify repairs.

Supports the contractor accountability flow:
- Citizens can upvote reports (confirms hazard exists)
- After authority marks as resolved: citizens can confirm or deny repair
- 3+ confirmations → status becomes "resolved"
- 3+ denials → status reverts to "reported" (escalation)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import (
    User, Report, Verification, VerificationType, ReportStatus
)
from app.schemas.schemas import VerificationCreate, VerificationResponse, VerificationSummary
from app.utils.auth import get_current_user
from app.services.gamification import (
    on_verification_cast, on_report_verified, on_report_resolved
)

router = APIRouter(prefix="/api/reports", tags=["Verifications"])

VERIFY_THRESHOLD = 3  # Minimum confirmations to change status
UPVOTE_THRESHOLD = 2  # Minimum upvotes for "verified" status


@router.post("/{report_id}/verify", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_verification(
    report_id: str,
    data: VerificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a verification for a report.
    - 'upvote': confirms the hazard exists (available on reported/verified reports)
    - 'repair_confirm': confirms the repair was done (available on resolved_unverified reports)
    - 'repair_deny': denies the repair was done (available on resolved_unverified reports)
    """
    # Fetch report
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Can't verify own report
    if report.user_id == current_user.id:  # type: ignore[union-attr]
        raise HTTPException(status_code=400, detail="Cannot verify your own report")

    # Validate verification type against report status
    if data.type == VerificationType.upvote:
        if report.status not in [ReportStatus.reported, ReportStatus.verified]:
            raise HTTPException(status_code=400, detail="Can only upvote reported or verified hazards")
    elif data.type in [VerificationType.repair_confirm, VerificationType.repair_deny]:
        if report.status != ReportStatus.resolved_unverified:  # type: ignore[union-attr]
            raise HTTPException(status_code=400, detail="Can only verify repair on 'resolved_unverified' reports")

    # Check for duplicate verification
    existing = await db.execute(
        select(Verification).where(
            Verification.report_id == report_id,
            Verification.user_id == current_user.id,
            Verification.type == data.type,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already submitted this verification")

    # Create verification
    verification = Verification(
        report_id=report.id,
        user_id=current_user.id,
        type=data.type,
    )
    db.add(verification)
    await db.flush()

    # Award gamification points to the voter
    await on_verification_cast(db, current_user.id, report.id)  # type: ignore[arg-type]

    # Process verification thresholds
    if data.type == VerificationType.upvote:
        # Count total upvotes
        upvote_count = await db.execute(
            select(func.count(Verification.id)).where(
                Verification.report_id == report_id,
                Verification.type == VerificationType.upvote,
            )
        )
        count = upvote_count.scalar() or 0
        report.upvote_count = count  # type: ignore[assignment]

        # If threshold met, update status to verified
        if count >= UPVOTE_THRESHOLD and report.status == ReportStatus.reported:  # type: ignore[union-attr]
            report.status = ReportStatus.verified  # type: ignore[assignment]
            # Award points to the reporter
            await on_report_verified(db, report.user_id, report.id)  # type: ignore[arg-type]

    elif data.type == VerificationType.repair_confirm:
        # Count confirmations
        confirm_count = await db.execute(
            select(func.count(Verification.id)).where(
                Verification.report_id == report_id,
                Verification.type == VerificationType.repair_confirm,
            )
        )
        count = confirm_count.scalar() or 0

        # 3+ confirmations → resolved
        if count >= VERIFY_THRESHOLD:
            report.status = ReportStatus.resolved  # type: ignore[assignment]
            await on_report_resolved(db, report.user_id, report.id)  # type: ignore[arg-type]

    elif data.type == VerificationType.repair_deny:
        # Count denials
        deny_count = await db.execute(
            select(func.count(Verification.id)).where(
                Verification.report_id == report_id,
                Verification.type == VerificationType.repair_deny,
            )
        )
        count = deny_count.scalar() or 0

        # 3+ denials → revert to reported (escalation)
        if count >= VERIFY_THRESHOLD:
            report.status = ReportStatus.reported  # type: ignore[assignment]
            report.resolved_at = None  # type: ignore[assignment]

    db.add(report)
    await db.flush()
    await db.refresh(verification)

    return VerificationResponse.model_validate(verification)


@router.get("/{report_id}/verifications", response_model=VerificationSummary)
async def get_verification_summary(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get verification summary for a report."""
    # Count each type
    upvotes = await db.execute(
        select(func.count(Verification.id)).where(
            Verification.report_id == report_id,
            Verification.type == VerificationType.upvote,
        )
    )
    confirms = await db.execute(
        select(func.count(Verification.id)).where(
            Verification.report_id == report_id,
            Verification.type == VerificationType.repair_confirm,
        )
    )
    denies = await db.execute(
        select(func.count(Verification.id)).where(
            Verification.report_id == report_id,
            Verification.type == VerificationType.repair_deny,
        )
    )

    # Check if current user has voted
    user_vote = await db.execute(
        select(Verification).where(
            Verification.report_id == report_id,
            Verification.user_id == current_user.id,
        )
    )

    return VerificationSummary(
        upvotes=upvotes.scalar() or 0,
        repair_confirms=confirms.scalar() or 0,
        repair_denies=denies.scalar() or 0,
        user_has_voted=user_vote.scalar_one_or_none() is not None,
    )
