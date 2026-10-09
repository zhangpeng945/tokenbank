from datetime import datetime

from sqlalchemy import DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Quota(Base):
    __tablename__ = "quotas"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    daily_limit: Mapped[int] = mapped_column(Integer, default=100000)    # max tokens per day (0 = unlimited)
    monthly_limit: Mapped[int] = mapped_column(Integer, default=3000000)  # max tokens per month
    used_today: Mapped[int] = mapped_column(Integer, default=0)
    used_this_month: Mapped[int] = mapped_column(Integer, default=0)
    reset_daily_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reset_monthly_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="quota")
