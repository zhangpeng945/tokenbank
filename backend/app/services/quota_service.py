"""Quota service: check and enforce daily/monthly token limits."""

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quota import Quota
from app.models.account import Account


async def get_or_create_quota(db: AsyncSession, user_id: int) -> Quota:
    stmt = select(Quota).where(Quota.user_id == user_id)
    result = await db.execute(stmt)
    quota = result.scalars().first()
    if quota is None:
        quota = Quota(user_id=user_id)
        db.add(quota)
        await db.commit()
        await db.refresh(quota)
    return quota


async def check_and_reset_if_needed(quota: Quota) -> None:
    """Reset counters if the period has elapsed."""
    now = datetime.now(timezone.utc)
    if quota.reset_daily_at.date() < now.date():
        quota.used_today = 0
        quota.reset_daily_at = now
    # Monthly reset: if we're in a different month
    if quota.reset_monthly_at.month != now.month or quota.reset_monthly_at.year != now.year:
        quota.used_this_month = 0
        quota.reset_monthly_at = now


async def check_quota(db: AsyncSession, user_id: int, estimated_tokens: int) -> bool:
    """Return True if the user can proceed, False if quota exceeded."""
    quota = await get_or_create_quota(db, user_id)
    await check_and_reset_if_needed(quota)
    if quota.daily_limit > 0 and quota.used_today + estimated_tokens > quota.daily_limit:
        return False
    if quota.monthly_limit > 0 and quota.used_this_month + estimated_tokens > quota.monthly_limit:
        return False
    return True


async def record_usage(db: AsyncSession, user_id: int, tokens: int) -> Quota:
    """Increment quota usage counters."""
    quota = await get_or_create_quota(db, user_id)
    await check_and_reset_if_needed(quota)
    quota.used_today += tokens
    quota.used_this_month += tokens
    await db.commit()
    await db.refresh(quota)
    return quota
