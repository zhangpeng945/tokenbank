from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance: Mapped[float] = mapped_column(Float, default=0.0)          # current balance (can go negative = debt)
    credit_limit: Mapped[float] = mapped_column(Float, default=10000.0)  # max debt allowed (positive number)
    frozen: Mapped[float] = mapped_column(Float, default=0.0)           # pre-deducted for in-flight requests
    interest_rate: Mapped[float] = mapped_column(Float, default=0.0001)  # daily rate for positive balance
    debt_interest_rate: Mapped[float] = mapped_column(Float, default=0.0005)  # daily rate for debt
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="account")

    @property
    def available(self) -> float:
        """Usable balance = balance - frozen + credit (if in debt)."""
        return self.balance - self.frozen + (self.credit_limit if self.balance < 0 else 0)
