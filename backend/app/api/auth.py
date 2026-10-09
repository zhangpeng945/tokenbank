from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.account import Account
from app.models.quota import Quota
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.user,
        status=UserStatus.active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Auto-create account and quota
    account = Account(user_id=user.id)
    quota = Quota(user_id=user.id)
    db.add(account)
    db.add(quota)
    await db.commit()

    token = create_access_token(str(user.id), {"email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email, role=user.role.value)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if user is None or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=403, detail="Account suspended")

    token = create_access_token(str(user.id), {"email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email, role=user.role.value)
