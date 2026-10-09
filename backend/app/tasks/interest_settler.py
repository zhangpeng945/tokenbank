"""Daily interest settlement: runs at 00:05 every day."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import async_session
from app.models.user import User
from app.services.bank_service import settle_daily_interest
from sqlalchemy import select

scheduler = AsyncIOScheduler()


async def run_daily_interest():
    async with async_session() as db:
        result = await db.execute(select(User.id))
        user_ids = result.scalars().all()
        for uid in user_ids:
            try:
                await settle_daily_interest(db, uid)
            except Exception:
                pass  # log in production


def start_scheduler():
    scheduler.add_job(run_daily_interest, "cron", hour=0, minute=5, id="daily_interest")
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
