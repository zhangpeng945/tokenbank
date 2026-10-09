"""Provider key pool: selection, health tracking, and cooldown management."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider_key import ProviderKey, ProviderKeyStatus, ProviderType
from app.utils.security import decrypt_provider_key


# Provider → upstream API base URLs
PROVIDER_BASE_URLS = {
    ProviderType.openai: "https://api.openai.com/v1",
    ProviderType.anthropic: "https://api.anthropic.com/v1",
    ProviderType.zhipu: "https://open.bigmodel.cn/api/paas/v4",
}


def get_provider_base_url(provider: ProviderType) -> str:
    return PROVIDER_BASE_URLS[provider]


def model_to_provider(model: str) -> ProviderType:
    """Map a model name to its provider."""
    model_lower = model.lower()
    if model_lower.startswith(("gpt-", "o1", "o3", "o4", "text-embedding", "dall-e", "whisper", "tts")):
        return ProviderType.openai
    if model_lower.startswith(("claude", "anthropic")):
        return ProviderType.anthropic
    if model_lower.startswith(("glm", "chatglm")):
        return ProviderType.zhipu
    # Default to OpenAI
    return ProviderType.openai


async def select_key(
    db: AsyncSession,
    provider: ProviderType,
) -> ProviderKey | None:
    """Pick the best available key using weighted priority ordering."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(ProviderKey)
        .where(
            ProviderKey.provider == provider,
            ProviderKey.status == ProviderKeyStatus.active,
        )
        .where(
            (ProviderKey.cooldown_until.is_(None))
            | (ProviderKey.cooldown_until < now)
        )
        .order_by(ProviderKey.priority.desc(), ProviderKey.weight.desc())
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    if not candidates:
        return None
    # Simple: pick the highest-priority, highest-weight candidate.
    # In production, use weighted round-robin with a shared counter.
    return candidates[0]


async def mark_key_cooldown(
    db: AsyncSession,
    key_id: int,
    seconds: int = 60,
    error: str | None = None,
) -> None:
    """Put a key into cooldown after a failure."""
    until = datetime.now(timezone.utc) + timedelta(seconds=seconds)
    await db.execute(
        update(ProviderKey)
        .where(ProviderKey.id == key_id)
        .values(
            status=ProviderKeyStatus.cooldown,
            cooldown_until=until,
            last_error=error,
        )
    )
    await db.commit()


async def mark_key_disabled(db: AsyncSession, key_id: int, error: str | None = None) -> None:
    await db.execute(
        update(ProviderKey)
        .where(ProviderKey.id == key_id)
        .values(status=ProviderKeyStatus.disabled, last_error=error)
    )
    await db.commit()


async def record_key_usage(db: AsyncSession, key_id: int, tokens: int) -> None:
    """Increment the key's usage counters."""
    await db.execute(
        update(ProviderKey)
        .where(ProviderKey.id == key_id)
        .values(
            requests_today=ProviderKey.requests_today + 1,
            tokens_today=ProviderKey.tokens_today + tokens,
        )
    )
    await db.commit()


def get_decrypted_key(key: ProviderKey) -> str:
    return decrypt_provider_key(key.encrypted_key)
