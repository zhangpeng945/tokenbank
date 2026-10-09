"""User dashboard APIs: profile, balance, usage, API key management."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserApiKey
from app.models.usage_log import UsageLog
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.quota import Quota
from app.schemas.user import (
    UserResponse, ApiKeyCreate, ApiKeyResponse,
    BalanceResponse, UsageLogResponse, UsageListResponse, UsageSummary,
)
from app.services import bank_service, quota_service
from app.utils.security import generate_api_key

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await bank_service.get_or_create_account(db, user.id)
    quota = await quota_service.get_or_create_quota(db, user.id)
    await quota_service.check_and_reset_if_needed(quota)
    available = account.balance - account.frozen
    if account.balance < 0:
        available += account.credit_limit
    return BalanceResponse(
        balance=account.balance,
        credit_limit=account.credit_limit,
        frozen=account.frozen,
        available=available,
        daily_limit=quota.daily_limit,
        monthly_limit=quota.monthly_limit,
        used_today=quota.used_today,
        used_this_month=quota.used_this_month,
    )


@router.get("/usage", response_model=UsageListResponse)
async def get_usage(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(UsageLog).where(UsageLog.user_id == user.id)
    if start_date:
        stmt = stmt.where(UsageLog.created_at >= start_date)
    if end_date:
        stmt = stmt.where(UsageLog.created_at <= end_date)
    stmt = stmt.order_by(UsageLog.created_at.desc())

    # count
    count_stmt = select(func.count()).select_from(UsageLog).where(UsageLog.user_id == user.id)
    if start_date:
        count_stmt = count_stmt.where(UsageLog.created_at >= start_date)
    if end_date:
        count_stmt = count_stmt.where(UsageLog.created_at <= end_date)
    total = (await db.execute(count_stmt)).scalar()

    # paginate
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = [UsageLogResponse.model_validate(r) for r in result.scalars().all()]

    return UsageListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/usage/summary", response_model=UsageSummary)
async def get_usage_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(UsageLog).where(UsageLog.user_id == user.id)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    total_tokens = sum(l.total_tokens for l in logs)
    total_cost = sum(l.cost for l in logs)
    by_model: dict[str, int] = {}
    by_provider: dict[str, int] = {}
    for l in logs:
        by_model[l.model] = by_model.get(l.model, 0) + l.total_tokens
        by_provider[l.provider] = by_provider.get(l.provider, 0) + l.total_tokens

    return UsageSummary(
        total_tokens=total_tokens,
        total_cost=total_cost,
        total_requests=len(logs),
        by_model=by_model,
        by_provider=by_provider,
    )


@router.get("/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.created_at.desc())
    count_stmt = select(func.count()).select_from(Transaction).where(Transaction.user_id == user.id)
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = [
        {
            "id": t.id, "type": t.type.value, "amount": t.amount,
            "balance_after": t.balance_after, "related_user_id": t.related_user_id,
            "description": t.description, "created_at": t.created_at.isoformat(),
        }
        for t in result.scalars().all()
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    req: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    full_key, key_hash = generate_api_key()
    api_key = UserApiKey(
        user_id=user.id,
        key_hash=key_hash,
        name=req.name,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    resp = ApiKeyResponse.model_validate(api_key)
    resp.key = full_key  # only shown once
    return resp


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(UserApiKey).where(UserApiKey.user_id == user.id).order_by(UserApiKey.created_at.desc())
    result = await db.execute(stmt)
    return [ApiKeyResponse.model_validate(r) for r in result.scalars().all()]


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user.id)
    result = await db.execute(stmt)
    key = result.scalars().first()
    if key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.delete(key)
    await db.commit()
    return {"detail": "API key deleted"}
