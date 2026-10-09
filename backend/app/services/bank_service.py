"""Token bank service: deposit, transfer, freeze/settle, interest."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.config import settings


async def get_or_create_account(db: AsyncSession, user_id: int) -> Account:
    stmt = select(Account).where(Account.user_id == user_id)
    result = await db.execute(stmt)
    account = result.scalars().first()
    if account is None:
        account = Account(
            user_id=user_id,
            balance=0.0,
            credit_limit=settings.default_credit_limit,
            frozen=0.0,
            interest_rate=settings.default_interest_rate,
            debt_interest_rate=settings.default_debt_interest_rate,
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
    return account


async def _record_transaction(
    db: AsyncSession,
    user_id: int,
    type_: TransactionType,
    amount: float,
    balance_after: float,
    related_user_id: int | None = None,
    description: str | None = None,
) -> Transaction:
    tx = Transaction(
        user_id=user_id,
        type=type_,
        amount=amount,
        balance_after=balance_after,
        related_user_id=related_user_id,
        description=description,
    )
    db.add(tx)
    return tx


async def deposit(
    db: AsyncSession, user_id: int, amount: float, description: str | None = None
) -> Account:
    if amount <= 0:
        raise ValueError("Deposit amount must be positive")
    account = await get_or_create_account(db, user_id)
    # If in debt, deposit pays off debt first (repay), remainder adds to balance
    if account.balance < 0:
        debt = -account.balance
        if amount <= debt:
            account.balance += amount
            await _record_transaction(
                db, user_id, TransactionType.repay, amount, account.balance,
                description=description or "Repay debt",
            )
        else:
            repay_amount = debt
            account.balance = 0.0
            remaining = amount - repay_amount
            account.balance += remaining
            await _record_transaction(
                db, user_id, TransactionType.repay, repay_amount, 0.0,
                description="Repay debt",
            )
            await _record_transaction(
                db, user_id, TransactionType.deposit, remaining, account.balance,
                description=description or "Deposit after repay",
            )
    else:
        account.balance += amount
        await _record_transaction(
            db, user_id, TransactionType.deposit, amount, account.balance,
            description=description,
        )
    await db.commit()
    await db.refresh(account)
    return account


async def transfer(
    db: AsyncSession,
    from_user_id: int,
    to_email: str,
    amount: float,
    description: str | None = None,
) -> tuple[Account, Account]:
    if amount <= 0:
        raise ValueError("Transfer amount must be positive")
    # Find recipient
    user_stmt = select(User).where(User.email == to_email)
    to_user = (await db.execute(user_stmt)).scalars().first()
    if to_user is None:
        raise ValueError(f"User {to_email} not found")
    if to_user.id == from_user_id:
        raise ValueError("Cannot transfer to yourself")

    from_account = await get_or_create_account(db, from_user_id)
    to_account = await get_or_create_account(db, to_user.id)

    # Check available balance
    available = from_account.balance - from_account.frozen
    if from_account.balance < 0:
        available += from_account.credit_limit
    if amount > available:
        raise ValueError("Insufficient available balance for transfer")

    from_account.balance -= amount
    to_account.balance += amount

    await _record_transaction(
        db, from_user_id, TransactionType.transfer_out, -amount, from_account.balance,
        related_user_id=to_user.id, description=description or f"Transfer to {to_email}",
    )
    await _record_transaction(
        db, to_user.id, TransactionType.transfer_in, amount, to_account.balance,
        related_user_id=from_user_id, description=description or f"Transfer from user#{from_user_id}",
    )
    await db.commit()
    await db.refresh(from_account)
    await db.refresh(to_account)
    return from_account, to_account


async def freeze_tokens(
    db: AsyncSession, user_id: int, amount: float
) -> Account:
    """Pre-freeze estimated tokens for an in-flight request."""
    account = await get_or_create_account(db, user_id)
    available = account.balance - account.frozen
    if account.balance < 0:
        available += account.credit_limit
    if amount > available:
        raise ValueError("Insufficient balance")
    account.frozen += amount
    await db.commit()
    await db.refresh(account)
    return account


async def settle_usage(
    db: AsyncSession,
    user_id: int,
    frozen_amount: float,
    actual_tokens: int,
    model: str,
    provider: str,
) -> Account:
    """Unfreeze pre-deducted amount and charge actual token consumption."""
    account = await get_or_create_account(db, user_id)
    # Unfreeze
    account.frozen = max(0.0, account.frozen - frozen_amount)
    # Charge actual tokens (1 token = 1 unit)
    account.balance -= actual_tokens
    await _record_transaction(
        db, user_id, TransactionType.withdraw, -actual_tokens, account.balance,
        description=f"API call: {provider}/{model}",
    )
    await db.commit()
    await db.refresh(account)
    return account


async def refund_frozen(
    db: AsyncSession, user_id: int, frozen_amount: float
) -> Account:
    """Release frozen tokens when a request fails."""
    account = await get_or_create_account(db, user_id)
    account.frozen = max(0.0, account.frozen - frozen_amount)
    await db.commit()
    await db.refresh(account)
    return account


async def settle_daily_interest(db: AsyncSession, user_id: int) -> float | None:
    """Calculate and apply daily interest. Returns interest amount or None."""
    account = await get_or_create_account(db, user_id)
    if account.balance > 0:
        interest = account.balance * account.interest_rate
        account.balance += interest
        await _record_transaction(
            db, user_id, TransactionType.interest, interest, account.balance,
            description="Daily interest (positive balance)",
        )
        await db.commit()
        await db.refresh(account)
        return interest
    elif account.balance < 0:
        interest = account.balance * account.debt_interest_rate  # negative × positive = negative
        account.balance += interest  # becomes more negative
        await _record_transaction(
            db, user_id, TransactionType.interest, interest, account.balance,
            description="Daily interest (debt)",
        )
        await db.commit()
        await db.refresh(account)
        return interest
    return None
