import httpx
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserRole


async def _fetch_jwks() -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/certs"
        )
        resp.raise_for_status()
        return resp.json().get("keys", [])


async def verify_keycloak_token(token: str) -> dict | None:
    try:
        unverified = jwt.get_unverified_headers(token)
        kid = unverified.get("kid")
        if not kid:
            return None
        keys = await _fetch_jwks()
        key_data = next((k for k in keys if k.get("kid") == kid), None)
        if not key_data:
            return None
        payload = jwt.decode(
            token,
            key_data,
            algorithms=[settings.keycloak_algorithm],
            options={"verify_aud": False},
        )
        return payload
    except (JWTError, Exception):
        return None


async def exchange_code_for_token(code: str, redirect_uri: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
            },
        )
        if resp.status_code != 200:
            return None
        return resp.json()


async def get_or_create_user_from_keycloak(
    token_info: dict,
    db: AsyncSession,
) -> tuple:
    email = (token_info.get("email") or "").strip().lower()
    if not email:
        raise ValueError("El token de Keycloak no contiene email")

    username = (
        token_info.get("preferred_username")
        or email.split("@")[0]
    )

    repo = UserRepository(db)
    user = await repo.get_by_email(email)

    if user is None:
        user = await repo.create(
            email=email,
            username=username,
            password_hash="",
            role=UserRole.OPERATOR,
        )
        await db.commit()
        await db.refresh(user)
        is_new = True
    else:
        is_new = False

    return user, is_new
