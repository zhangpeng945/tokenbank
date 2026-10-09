"""Token bank APIs: deposit, transfer, statement, interest rate."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.bank import DepositRequest, TransferRequest, BalanceResponse, InterestRateResponse
from app.services import bank_service

router = APIRouter(prefix="/api/bank", tags=["bank"])


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await bank_service.get_or_create_account(db, user.id)
    available = account.balance - account.frozen
    if account.balance < 0:
        available += account.credit_limit
    return BalanceResponse(
        balance=account.balance,
        credit_limit=account.credit_limit,
        frozen=account.frozen,
        available=available,
        interest_rate=account.interest_rate,
        debt_interest_rate=account.debt_interest_rate,
    )


@router.post("/deposit")
async def deposit(
    req: DepositRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        account = await bank_service.deposit(db, user.id, req.amount, req.description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "balance": account.balance,
        "frozen": account.frozen,
        "available": account.balance - account.frozen,
    }


@router.post("/transfer")
async def transfer(
    req: TransferRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        from_acc, to_acc = await bank_service.transfer(
            db, user.id, req.to_email, req.amount, req.description
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "balance": from_acc.balance,
        "frozen": from_acc.frozen,
        "transferred": req.amount,
    }


@router.get("/statement")
async def get_statement(
    page: int = 1,
    page_size: int = 20,
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


@router.get("/interest-rate", response_model=InterestRateResponse)
async def get_interest_rate(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await bank_service.get_or_create_account(db, user.id)
    return InterestRateResponse(
        interest_rate=account.interest_rate,
        debt_interest_rate=account.debt_interest_rate,
        credit_limit=account.credit_limit,
    )
