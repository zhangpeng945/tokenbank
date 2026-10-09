import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProviderType(str, enum.Enum):
    openai = "openai"
    anthropic = "anthropic"
    zhipu = "zhipu"


class ProviderKeyStatus(str, enum.Enum):
    active = "active"
    cooldown = "cooldown"
    disabled = "disabled"


class ProviderKey(Base):
    __tablename__ = "provider_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[ProviderType] = mapped_column(Enum(ProviderType), nullable=False, index=True)
    encrypted_key: Mapped[str] = mapped_column(String(512), nullable=False)
    name: Mapped[str] = mapped_column(String(100), default="default")
    status: Mapped[ProviderKeyStatus] = mapped_column(
        Enum(ProviderKeyStatus), default=ProviderKeyStatus.active, nullable=False
    )
    priority: Mapped[int] = mapped_column(Integer, default=0)  # higher = used first
    weight: Mapped[int] = mapped_column(Integer, default=1)    # for weighted round-robin
    daily_limit: Mapped[int] = mapped_column(Integer, default=0)     # 0 = unlimited
    monthly_limit: Mapped[int] = mapped_column(Integer, default=0)
    requests_today: Mapped[int] = mapped_column(Integer, default=0)
    tokens_today: Mapped[int] = mapped_column(Integer, default=0)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
