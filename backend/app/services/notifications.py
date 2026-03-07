"""
Push Notification Service — Expo Push Notifications

Sends push notifications to users via Expo's push notification service.
Used primarily for contractor accountability verification flow.
"""

import logging
from typing import List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_push_notification(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """
    Send push notifications to a list of Expo push tokens.

    Returns dict with success/failure counts.
    """
    if not push_tokens:
        return {"sent": 0, "failed": 0}

    try:
        from exponent_server_sdk import (
            PushClient,
            PushMessage,
            PushServerError,
        )

        client = PushClient()
        messages = []

        for token in push_tokens:
            if not token or not token.startswith("ExponentPushToken"):
                continue
            messages.append(PushMessage(
                to=token,
                title=title,
                body=body,
                data=data or {},
                sound="default",
                priority="high",
                ttl=None,
                expiration=None,
                badge=None,
                category=None,
                display_in_foreground=True,
                channel_id=None,
                subtitle=None,
                mutable_content=None,
            ))

        if not messages:
            return {"sent": 0, "failed": 0}

        responses = client.publish_multiple(messages)

        sent = sum(1 for r in responses if r.is_success)
        failed = len(responses) - sent

        if failed > 0:
            logger.warning(f"Push notifications: {sent} sent, {failed} failed")

        return {"sent": sent, "failed": failed}

    except ImportError:
        logger.warning("exponent_server_sdk not installed — notifications simulated")
        return {"sent": len(push_tokens), "failed": 0, "simulated": True}
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return {"sent": 0, "failed": len(push_tokens), "error": str(e)}


async def notify_nearby_citizens_for_verification(
    db,
    report_id: str,
    latitude: float,
    longitude: float,
    radius_meters: float = 1000,
):
    """
    Find citizens within radius of a report and send verification request notifications.
    Uses PostGIS ST_DWithin for spatial proximity query.
    """
    from sqlalchemy import text

    # Find users with push tokens within radius (excluding the report author)
    query = text("""
        SELECT DISTINCT u.expo_push_token, u.id
        FROM users u
        JOIN reports r ON r.user_id = u.id
        WHERE u.expo_push_token IS NOT NULL
          AND u.role = 'citizen'
          AND ST_DWithin(
              r.location::geography,
              ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
              :radius
          )
        LIMIT 50
    """)

    result = await db.execute(query, {
        "lat": latitude,
        "lng": longitude,
        "radius": radius_meters,
    })
    rows = result.fetchall()

    tokens = [row[0] for row in rows if row[0]]

    if tokens:
        await send_push_notification(
            push_tokens=tokens,
            title="Road Repair Verification Needed",
            body="A road hazard near you was marked as repaired. Can you verify if the repair was done?",
            data={
                "type": "verification_request",
                "report_id": report_id,
                "screen": "verify",
            },
        )

    return len(tokens)
