"""Billing: calculate cost from token usage and pricing table."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pricing import Pricing

# Fallback pricing if no DB entry (USD per 1K tokens)
DEFAULT_PRICING = {
    ("openai", "gpt-4o"): (0.0025, 0.01),
    ("openai", "gpt-4o-mini"): (0.00015, 0.0006),
    ("openai", "gpt-4-turbo"): (0.01, 0.03),
    ("openai", "gpt-3.5-turbo"): (0.0005, 0.0015),
    ("anthropic", "claude-3-5-sonnet"): (0.003, 0.015),
    ("anthropic", "claude-3-opus"): (0.015, 0.075),
    ("anthropic", "claude-3-haiku"): (0.00025, 0.00125),
    ("zhipu", "glm-4"): (0.001, 0.001),
    ("zhipu", "glm-4-flash"): (0.0001, 0.0001),
}


async def get_pricing(db: AsyncSession, provider: str, model: str) -> tuple[float, float]:
    """Return (input_price_per_1k, output_price_per_1k)."""
    stmt = select(Pricing).where(Pricing.provider == provider, Pricing.model == model)
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row:
        return row.input_price_per_1k, row.output_price_per_1k
    return DEFAULT_PRICING.get((provider, model), (0.002, 0.006))


async def calculate_cost(
    db: AsyncSession,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> float:
    input_price, output_price = await get_pricing(db, provider, model)
    return (prompt_tokens / 1000.0) * input_price + (completion_tokens / 1000.0) * output_price
