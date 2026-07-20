from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings
from app.schemas.auth import AuthenticatedUser, UserRole

ROLE_ALIASES: dict[str, UserRole] = {
    "admin": UserRole.ADMIN,
    "administrator": UserRole.ADMIN,
    "supervisor": UserRole.SUPERVISOR,
    "operador": UserRole.OPERATOR,
    "operator": UserRole.OPERATOR,
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def normalize_role(role_name: str) -> UserRole:
    normalized_role = role_name.strip().lower()

    role = ROLE_ALIASES.get(normalized_role)

    if role is None:
        raise ValueError(f"Rol no válido: {role_name}")
    return role


def create_demo_user(role_name: str) -> AuthenticatedUser:
    role = normalize_role(role_name)

    return AuthenticatedUser(
        subject=f"demo-{role.value}",
        email=f"demo-{role.value}@demo.local",
        username=f"demo_{role.value}",
        roles={role},
        is_demo=True,
    )


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def create_refresh_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None
