from datetime import datetime

from pydantic import BaseModel

from app.models.provider_key import ProviderKeyStatus, ProviderType
from app.models.user import UserRole, UserStatus


# ── Provider Key ──────────────────────────────────────────

class ProviderKeyCreate(BaseModel):
    provider: ProviderType
    key: str
    name: str = "default"
    priority: int = 0
    weight: int = 1
    daily_limit: int = 0
    monthly_limit: int = 0


class ProviderKeyUpdate(BaseModel):
    name: str | None = None
    priority: int | None = None
    weight: int | None = None
    daily_limit: int | None = None
    monthly_limit: int | None = None
    status: ProviderKeyStatus | None = None


class ProviderKeyResponse(BaseModel):
    id: int
    provider: ProviderType
    name: str
    status: ProviderKeyStatus
    priority: int
    weight: int
    daily_limit: int
    monthly_limit: int
    requests_today: int
    tokens_today: int
    cooldown_until: datetime | None = None
    last_error: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Quota ─────────────────────────────────────────────────

class QuotaUpdate(BaseModel):
    daily_limit: int | None = None
    monthly_limit: int | None = None


# ── Pricing ───────────────────────────────────────────────

class PricingCreate(BaseModel):
    provider: str
    model: str
    input_price_per_1k: float
    output_price_per_1k: float
    currency: str = "USD"


class PricingResponse(BaseModel):
    id: int
    provider: str
    model: str
    input_price_per_1k: float
    output_price_per_1k: float
    currency: str
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Admin Stats ───────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    total_keys: int
    active_keys: int
    total_tokens_consumed: int
    total_cost: float
    total_balance: float
