from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Pricing(Base):
    __tablename__ = "pricing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    input_price_per_1k: Mapped[float] = mapped_column(Float, default=0.0)   # USD per 1K input tokens
    output_price_per_1k: Mapped[float] = mapped_column(Float, default=0.0)  # USD per 1K output tokens
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
