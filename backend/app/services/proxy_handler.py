"""Proxy handler: forward requests to upstream LLM providers with key rotation."""

import json
import time
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.provider_key import ProviderKey, ProviderType
from app.models.usage_log import UsageLog, UsageStatus
from app.services import key_pool, token_counter, billing, bank_service, quota_service


# ── Provider-specific request transformation ───────────────

def _build_upstream_request(
    provider: ProviderType,
    body: dict,
    api_key: str,
) -> tuple[str, dict, dict]:
    """Return (url, headers, json_body) for the upstream call."""
    base = key_pool.get_provider_base_url(provider)
    if provider == ProviderType.openai:
        return (
            f"{base}/chat/completions",
            {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            body,
        )
    if provider == ProviderType.anthropic:
        # Anthropic uses x-api-key header and different body format
        anthropic_body = {
            "model": body["model"],
            "messages": body["messages"],
            "max_tokens": body.get("max_tokens", 4096),
            "stream": body.get("stream", False),
        }
        if body.get("temperature") is not None:
            anthropic_body["temperature"] = body["temperature"]
        return (
            f"{base}/messages",
            {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            anthropic_body,
        )
    if provider == ProviderType.zhipu:
        # Zhipu GLM uses Bearer auth and OpenAI-compatible body
        return (
            f"{base}/chat/completions",
            {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            body,
        )
    # Default: OpenAI format
    return (
        f"{base}/chat/completions",
        {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        body,
    )


def _extract_usage_from_stream_chunk(chunk_data: dict) -> tuple[int, int]:
    """Extract usage tokens from a streaming chunk (if present)."""
    usage = chunk_data.get("usage")
    if usage:
        return usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
    return 0, 0


# ── Main proxy entry ───────────────────────────────────────

async def handle_chat_completion(
    request: Request,
    db: AsyncSession,
    user_id: int,
    body: dict,
) -> JSONResponse | StreamingResponse:
    model = body.get("model", "gpt-4o")
    messages = body.get("messages", [])
    is_stream = body.get("stream", False)

    provider = key_pool.model_to_provider(model)
    request_id = str(uuid.uuid4())

    # 1. Estimate tokens and freeze balance
    est_prompt = token_counter.estimate_request_tokens(messages, model)
    est_total = est_prompt + 500  # rough completion estimate
    try:
        await bank_service.freeze_tokens(db, user_id, est_total)
    except ValueError:
        return JSONResponse(
            status_code=402,
            content={"error": {"message": "Insufficient token balance", "type": "insufficient_balance"}},
        )

    # 2. Check quota
    ok = await quota_service.check_quota(db, user_id, est_total)
    if not ok:
        await bank_service.refund_frozen(db, user_id, est_total)
        return JSONResponse(
            status_code=429,
            content={"error": {"message": "Daily or monthly quota exceeded", "type": "quota_exceeded"}},
        )

    # 3. Forward with retry
    start_time = time.time()
    last_error = None
    for attempt in range(settings.proxy_max_retries):
        key = await key_pool.select_key(db, provider)
        if key is None:
            last_error = "No available API key"
            break

        api_key = key_pool.get_decrypted_key(key)
        url, headers, upstream_body = _build_upstream_request(provider, body, api_key)

        try:
            if is_stream:
                return await _stream_response(
                    db, user_id, key, provider, model, est_total,
                    url, headers, upstream_body, request_id, start_time,
                )
            else:
                return await _non_stream_response(
                    db, user_id, key, provider, model, est_total,
                    url, headers, upstream_body, request_id, start_time,
                )
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status == 429:
                await key_pool.mark_key_cooldown(db, key.id, seconds=60, error=str(exc))
                last_error = "Rate limited"
                continue
            elif status in (401, 403):
                await key_pool.mark_key_disabled(db, key.id, error=str(exc))
                last_error = "Key invalid"
                continue
            elif status >= 500:
                await key_pool.mark_key_cooldown(db, key.id, seconds=30, error=str(exc))
                last_error = "Upstream error"
                continue
            else:
                await bank_service.refund_frozen(db, user_id, est_total)
                return JSONResponse(
                    status_code=status,
                    content=exc.response.json(),
                )
        except httpx.RequestError as exc:
            await key_pool.mark_key_cooldown(db, key.id, seconds=30, error=str(exc))
            last_error = str(exc)
            continue

    # All retries exhausted
    await bank_service.refund_frozen(db, user_id, est_total)
    await _log_usage(
        db, user_id, provider, model, 0, 0, 0.0, None,
        int((time.time() - start_time) * 1000), UsageStatus.failed,
        request_id, last_error,
    )
    return JSONResponse(
        status_code=503,
        content={"error": {"message": f"All API keys exhausted: {last_error}", "type": "no_available_key"}},
    )


async def _non_stream_response(
    db, user_id, key, provider, model, est_total,
    url, headers, body, request_id, start_time,
) -> JSONResponse:
    async with httpx.AsyncClient(timeout=settings.proxy_upstream_timeout) as client:
        resp = await client.post(url, headers=headers, json=body)

    latency = int((time.time() - start_time) * 1000)
    resp_json = resp.json()

    if resp.status_code != 200:
        await bank_service.refund_frozen(db, user_id, est_total)
        await _log_usage(
            db, user_id, provider, model, 0, 0, 0.0, key.id,
            latency, UsageStatus.failed, request_id, str(resp_json),
        )
        return JSONResponse(status_code=resp.status_code, content=resp_json)

    prompt_tokens, completion_tokens = token_counter.extract_usage_from_response(resp_json)
    total_tokens = prompt_tokens + completion_tokens
    # Fallback: estimate if provider didn't return usage
    if total_tokens == 0:
        prompt_tokens = token_counter.estimate_request_tokens(body.get("messages", []), model)
        completion_tokens = token_counter.count_text_tokens(
            resp_json.get("choices", [{}])[0].get("message", {}).get("content", ""), model
        )
        total_tokens = prompt_tokens + completion_tokens

    cost = await billing.calculate_cost(db, provider, model, prompt_tokens, completion_tokens)

    # Settle: un-freeze, charge actual tokens, log
    await bank_service.settle_usage(db, user_id, est_total, total_tokens, model, provider)
    await quota_service.record_usage(db, user_id, total_tokens)
    await key_pool.record_key_usage(db, key.id, total_tokens)
    await _log_usage(
        db, user_id, provider, model, prompt_tokens, completion_tokens,
        cost, key.id, latency, UsageStatus.success, request_id, None,
    )

    # Inject usage into response so the client sees consumption
    resp_json.setdefault("usage", {})
    resp_json["usage"]["prompt_tokens"] = prompt_tokens
    resp_json["usage"]["completion_tokens"] = completion_tokens
    resp_json["usage"]["total_tokens"] = total_tokens

    return JSONResponse(status_code=200, content=resp_json)


async def _stream_response(
    db, user_id, key, provider, model, est_total,
    url, headers, body, request_id, start_time,
) -> StreamingResponse:
    """Stream SSE response while counting completion tokens."""

    async def generate():
        completion_tokens = 0
        prompt_tokens = 0
        has_error = False
        async with httpx.AsyncClient(timeout=settings.proxy_upstream_timeout) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code != 200:
                    has_error = True
                    error_body = await resp.aread()
                    yield error_body
                    return

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    yield f"{line}\n\n"

                    # Parse usage from stream chunks (OpenAI sends usage in final chunk
                    # when stream_options.include_usage is set)
                    if line.startswith("data: ") and not line.startswith("data: [DONE]"):
                        try:
                            chunk = json.loads(line[6:])
                            p, c = _extract_usage_from_stream_chunk(chunk)
                            prompt_tokens = max(prompt_tokens, p)
                            completion_tokens += c
                        except (json.JSONDecodeError, KeyError):
                            pass

        latency = int((time.time() - start_time) * 1000)

        if has_error:
            await bank_service.refund_frozen(db, user_id, est_total)
            await _log_usage(
                db, user_id, provider, model, 0, 0, 0.0, key.id,
                latency, UsageStatus.failed, request_id, "Stream error",
            )
            return

        # If usage wasn't in stream, estimate prompt tokens
        if prompt_tokens == 0:
            prompt_tokens = token_counter.estimate_request_tokens(body.get("messages", []), model)
        # If no completion tokens counted from stream, use tiktoken on accumulated text
        if completion_tokens == 0:
            # Approximate: estimate from response length (not ideal but a fallback)
            completion_tokens = max(1, est_total - prompt_tokens)

        total_tokens = prompt_tokens + completion_tokens
        cost = await billing.calculate_cost(db, provider, model, prompt_tokens, completion_tokens)

        await bank_service.settle_usage(db, user_id, est_total, total_tokens, model, provider)
        await quota_service.record_usage(db, user_id, total_tokens)
        await key_pool.record_key_usage(db, key.id, total_tokens)
        await _log_usage(
            db, user_id, provider, model, prompt_tokens, completion_tokens,
            cost, key.id, latency, UsageStatus.success, request_id, None,
        )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _log_usage(
    db: AsyncSession,
    user_id: int,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cost: float,
    provider_key_id: int | None,
    latency_ms: int,
    status: UsageStatus,
    request_id: str,
    error_message: str | None,
) -> None:
    log = UsageLog(
        user_id=user_id,
        provider=provider,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost=cost,
        provider_key_id=provider_key_id,
        latency_ms=latency_ms,
        status=status,
        request_id=request_id,
        error_message=error_message,
    )
    db.add(log)
    await db.commit()
