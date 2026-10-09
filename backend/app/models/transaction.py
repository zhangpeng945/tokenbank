import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TransactionType(str, enum.Enum):
    deposit = "deposit"             # add tokens
    withdraw = "withdraw"           # consume tokens (API call)
    borrow = "borrow"               # went into debt
    repay = "repay"                  # pay back debt
    transfer_in = "transfer_in"     # received from another user
    transfer_out = "transfer_out"   # sent to another user
    interest = "interest"           # daily interest settlement


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)         # positive=credit, negative=debit
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)
    related_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # for transfers
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
