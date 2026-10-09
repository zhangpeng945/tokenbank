from datetime import datetime

from pydantic import BaseModel

from app.models.user import UserRole, UserStatus
from app.models.usage_log import UsageStatus


class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    name: str = "default"


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key: str | None = None  # only returned on creation
    last_used_at: datetime | None = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    balance: float
    credit_limit: float
    frozen: float
    available: float
    daily_limit: int
    monthly_limit: int
    used_today: int
    used_this_month: int


class UsageLogResponse(BaseModel):
    id: int
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost: float
    latency_ms: int
    status: UsageStatus
    error_message: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class UsageListResponse(BaseModel):
    items: list[UsageLogResponse]
    total: int
    page: int
    page_size: int


class UsageSummary(BaseModel):
    total_tokens: int
    total_cost: float
    total_requests: int
    by_model: dict[str, int]
    by_provider: dict[str, int]
