"""LLM proxy endpoints — OpenAI-compatible."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_user_from_api_key
from app.models.user import User
from app.models.provider_key import ProviderKey, ProviderKeyStatus, ProviderType
from app.models.pricing import Pricing
from app.schemas.proxy import ModelListResponse, ModelInfo
from app.services.proxy_handler import handle_chat_completion
from sqlalchemy import select

router = APIRouter(tags=["proxy"])


@router.get("/v1/models", response_model=ModelListResponse)
async def list_models(
    user: User = Depends(get_user_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    """List available models based on configured provider keys."""
    stmt = select(ProviderKey).where(
        ProviderKey.status.in_([ProviderKeyStatus.active, ProviderKeyStatus.cooldown])
    ).distinct(ProviderKey.provider)
    result = await db.execute(stmt)
    keys = result.scalars().all()

    models_map = {
        ProviderType.openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        ProviderType.anthropic: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
        ProviderType.zhipu: ["glm-4", "glm-4-flash"],
    }

    models = []
    for key in keys:
        for m in models_map.get(key.provider, []):
            models.append(ModelInfo(id=m, owned_by=key.provider.value))

    if not models:
        models = [ModelInfo(id="gpt-4o-mini", owned_by="openai")]

    return ModelListResponse(data=models)


@router.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    user: User = Depends(get_user_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    return await handle_chat_completion(request, db, user.id, body)
