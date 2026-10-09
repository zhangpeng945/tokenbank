"""Authentication dependencies: JWT (dashboard) and API key (proxy)."""

from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserApiKey, UserRole, UserStatus
from app.utils.security import decode_access_token, verify_api_key


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT-based auth for dashboard/management APIs."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid auth header")
    token = auth[7:]
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = int(payload.get("sub", 0))
    user = await db.get(User, user_id)
    if user is None or user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or suspended")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def get_user_from_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """API key-based auth for the LLM proxy endpoint (/v1/*)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
    plain_key = auth[7:]

    # Fetch all active keys and verify (in production, use a hash index lookup)
    stmt = select(UserApiKey).where(UserApiKey.is_active.is_(True))
    result = await db.execute(stmt)
    keys = result.scalars().all()

    for k in keys:
        if verify_api_key(plain_key, k.key_hash):
            # Update last_used_at
            k.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            user = await db.get(User, k.user_id)
            if user is None or user.status != UserStatus.active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account suspended")
            return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
