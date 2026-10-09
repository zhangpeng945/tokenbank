"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session
from app.models.user import User, UserRole, UserStatus
from app.models.account import Account
from app.models.quota import Quota
from app.utils.security import hash_password, create_access_token
from app.api import auth, proxy, user, bank, admin
from app.tasks.interest_settler import start_scheduler, stop_scheduler
from app.tasks.key_health_check import start_scheduler as start_key_scheduler
from sqlalchemy import select


async def _ensure_admin():
    """Create a default admin account if none exists."""
    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        if result.scalars().first():
            return
        admin_user = User(
            email="admin@tokenbank.app",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
            status=UserStatus.active,
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        db.add(Account(user_id=admin_user.id, balance=1000000.0))
        db.add(Quota(user_id=admin_user.id, daily_limit=0, monthly_limit=0))
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await _ensure_admin()
    start_scheduler()
    start_key_scheduler()
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    description="LLM API Token Sharing & Banking Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(proxy.router)
app.include_router(user.router)
app.include_router(bank.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"name": settings.app_name, "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
