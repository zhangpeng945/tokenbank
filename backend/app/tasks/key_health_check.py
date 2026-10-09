"""Key health check: reset daily counters and clear stale cooldowns."""

from datetime import datetime, timezone

from sqlalchemy import select, update

from app.database import async_session
from app.models.provider_key import ProviderKey, ProviderKeyStatus

from .interest_settler import scheduler


async def run_daily_key_reset():
    """Reset daily usage counters and reactivate keys whose cooldown has expired."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        # Reset counters for all keys
        await db.execute(
            update(ProviderKey).values(requests_today=0, tokens_today=0)
        )
        # Reactivate keys whose cooldown has expired
        await db.execute(
            update(ProviderKey)
            .where(
                ProviderKey.status == ProviderKeyStatus.cooldown,
                ProviderKey.cooldown_until < now,
            )
            .values(status=ProviderKeyStatus.active, cooldown_until=None)
        )
        await db.commit()


def start_scheduler():
    scheduler.add_job(run_daily_key_reset, "cron", hour=0, minute=0, id="daily_key_reset")
    if not scheduler.running:
        scheduler.start()
