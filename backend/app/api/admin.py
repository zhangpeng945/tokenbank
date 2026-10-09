"""Admin APIs: provider key management, user management, quota, pricing, stats."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_admin
from app.models.user import User, UserRole, UserStatus
from app.models.provider_key import ProviderKey, ProviderType, ProviderKeyStatus
from app.models.pricing import Pricing
from app.models.usage_log import UsageLog
from app.models.account import Account
from app.schemas.admin import (
    ProviderKeyCreate, ProviderKeyUpdate, ProviderKeyResponse,
    QuotaUpdate, PricingCreate, PricingResponse, AdminStats,
)
from app.utils.security import encrypt_provider_key

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Provider Keys ─────────────────────────────────────────

@router.get("/keys", response_model=list[ProviderKeyResponse])
async def list_keys(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProviderKey).order_by(ProviderKey.provider, ProviderKey.priority.desc()))
    return [ProviderKeyResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/keys", response_model=ProviderKeyResponse)
async def create_key(
    req: ProviderKeyCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    key = ProviderKey(
        provider=req.provider,
        encrypted_key=encrypt_provider_key(req.key),
        name=req.name,
        priority=req.priority,
        weight=req.weight,
        daily_limit=req.daily_limit,
        monthly_limit=req.monthly_limit,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return ProviderKeyResponse.model_validate(key)


@router.put("/keys/{key_id}", response_model=ProviderKeyResponse)
async def update_key(
    key_id: int,
    req: ProviderKeyUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    key = await db.get(ProviderKey, key_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Key not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(key, field, value)
    await db.commit()
    await db.refresh(key)
    return ProviderKeyResponse.model_validate(key)


@router.delete("/keys/{key_id}")
async def delete_key(
    key_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    key = await db.get(ProviderKey, key_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Key not found")
    await db.delete(key)
    await db.commit()
    return {"detail": "Key deleted"}


# ── Users ─────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [
        {
            "id": u.id, "email": u.email, "role": u.role.value,
            "status": u.status.value, "created_at": u.created_at.isoformat(),
        }
        for u in result.scalars().all()
    ]


# ── Pricing ───────────────────────────────────────────────

@router.get("/pricing", response_model=list[PricingResponse])
async def list_pricing(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pricing).order_by(Pricing.provider, Pricing.model))
    return [PricingResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/pricing", response_model=PricingResponse)
async def create_pricing(
    req: PricingCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Pricing).where(Pricing.provider == req.provider, Pricing.model == req.model)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Pricing entry already exists for this model")
    pricing = Pricing(**req.model_dump())
    db.add(pricing)
    await db.commit()
    await db.refresh(pricing)
    return PricingResponse.model_validate(pricing)


# ── Stats ─────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_keys = (await db.execute(select(func.count()).select_from(ProviderKey))).scalar()
    active_keys = (
        await db.execute(
            select(func.count()).select_from(ProviderKey).where(ProviderKey.status == ProviderKeyStatus.active)
        )
    ).scalar()
    total_tokens = (await db.execute(select(func.coalesce(func.sum(UsageLog.total_tokens), 0)))).scalar()
    total_cost = (await db.execute(select(func.coalesce(func.sum(UsageLog.cost), 0.0)))).scalar()
    total_balance = (await db.execute(select(func.coalesce(func.sum(Account.balance), 0.0)))).scalar()

    return AdminStats(
        total_users=total_users,
        total_keys=total_keys,
        active_keys=active_keys,
        total_tokens_consumed=total_tokens,
        total_cost=total_cost,
        total_balance=total_balance,
    )
