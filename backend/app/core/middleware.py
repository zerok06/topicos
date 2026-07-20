from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware


from app.core.config import settings
from app.core.security import create_demo_user, decode_token, normalize_role
from app.schemas.auth import AuthenticatedUser, UserRole


PUBLIC_PATHS = {
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/health/",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/ws/stock",
}


def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin", "")
    if origin in settings.cors_origins_list:
        return {"Access-Control-Allow-Origin": origin}
    return {}


def _user_from_jwt(payload: dict) -> AuthenticatedUser | None:
    user_id = payload.get("sub")
    email = payload.get("email")
    role_str = payload.get("role")

    if user_id is None or role_str is None:
        return None

    try:
        role = normalize_role(role_str)
    except ValueError:
        return None

    return AuthenticatedUser(
        subject=user_id,
        email=email,
        username=email,
        roles={role},
        is_demo=False,
    )


class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(
            self,
            request: Request,
            call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
            payload = decode_token(token)
            if payload is None or payload.get("type") != "access":
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Token de acceso inválido o expirado"},
                    headers={"WWW-Authenticate": "Bearer", **_cors_headers(request)},
                )
            user = _user_from_jwt(payload)
            if user is None:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Token malformado"},
                    headers={"WWW-Authenticate": "Bearer", **_cors_headers(request)},
                )
            request.state.user = user
            return await call_next(request)

        demo_role = request.headers.get(settings.demo_role_header)

        if demo_role is None:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": (
                        "No autenticado. Proporciona un token JWT "
                        "o la cabecera de demo."
                    )
                },
                headers={"WWW-Authenticate": "Bearer", **_cors_headers(request)},
            )
        try:
            request.state.user = create_demo_user(demo_role)
        except ValueError as exc:
            return JSONResponse(
                status_code=401,
                content={"detail": str(exc)},
                headers=_cors_headers(request),
            )
        return await call_next(request)
