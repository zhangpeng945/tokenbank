"""Token counting utilities — pure Python estimation (no tiktoken dependency)."""

import json
import re


# Rough tokens-per-character ratios by language
# English: ~4 chars per token → 0.25 tokens/char
# Chinese: ~1.5 chars per token → 0.67 tokens/char
# Mixed/Code: ~3 chars per token → 0.33 tokens/char

CJK_PATTERN = re.compile(r"[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]")


def count_text_tokens(text: str, model: str = "gpt-4o") -> int:
    """Estimate token count for a text string."""
    if not text:
        return 0
    # Count CJK characters
    cjk_count = len(CJK_PATTERN.findall(text))
    total_chars = len(text)
    non_cjk_chars = total_chars - cjk_count
    # CJK: ~1.5 chars per token; non-CJK: ~4 chars per token
    tokens = int(cjk_count / 1.5 + non_cjk_chars / 4.0)
    # Minimum 1 token for non-empty text
    return max(1, tokens)


def count_messages_tokens(messages: list[dict], model: str = "gpt-4o") -> int:
    """Estimate token count for a list of chat messages (OpenAI format)."""
    total = 0
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if isinstance(content, list):
            content = json.dumps(content, ensure_ascii=False)
        # Per-message overhead: ~4 tokens for role + structural markers
        total += count_text_tokens(str(content), model) + count_text_tokens(role, model) + 4
    total += 3  # final assistant priming
    return total


def extract_usage_from_response(body: dict) -> tuple[int, int]:
    """Extract prompt_tokens, completion_tokens from a provider response."""
    usage = body.get("usage", {})
    prompt = usage.get("prompt_tokens", 0)
    completion = usage.get("completion_tokens", 0)
    # Also handle Anthropic's usage format
    if not prompt:
        prompt = usage.get("input_tokens", 0)
    if not completion:
        completion = usage.get("output_tokens", 0)
    return prompt, completion


def estimate_request_tokens(messages: list[dict], model: str) -> int:
    """Rough estimate for pre-freezing balance."""
    return count_messages_tokens(messages, model)
