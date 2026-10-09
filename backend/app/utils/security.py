import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fernet cipher for encrypting provider API keys at rest.
# Falls back to an ephemeral key if not configured (dev only).
_fernet_key = settings.encryption_key or Fernet.generate_key().decode()
_fernet = Fernet(_fernet_key.encode())


# ── Password hashing ──────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────

def create_access_token(subject: str, extra: Optional[dict] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire, "iat": now}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


# ── API Key generation (platform keys for users) ──────────

API_KEY_PREFIX = "tbk"


def generate_api_key() -> tuple[str, str]:
    """Return (full_key, key_hash). Store only the hash."""
    raw = secrets.token_urlsafe(32)
    full_key = f"{API_KEY_PREFIX}-{raw}"
    key_hash = pwd_context.hash(full_key)
    return full_key, key_hash


def verify_api_key(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Provider key encryption ───────────────────────────────

def encrypt_provider_key(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_provider_key(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()
