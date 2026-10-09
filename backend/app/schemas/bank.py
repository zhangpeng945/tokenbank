from datetime import datetime

from pydantic import BaseModel

from app.models.transaction import TransactionType


class BalanceResponse(BaseModel):
    balance: float
    credit_limit: float
    frozen: float
    available: float
    interest_rate: float
    debt_interest_rate: float


class DepositRequest(BaseModel):
    amount: float
    description: str | None = None


class TransferRequest(BaseModel):
    to_email: str
    amount: float
    description: str | None = None


class TransactionResponse(BaseModel):
    id: int
    type: TransactionType
    amount: float
    balance_after: float
    related_user_id: int | None = None
    description: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class InterestRateResponse(BaseModel):
    interest_rate: float
    debt_interest_rate: float
    credit_limit: float
