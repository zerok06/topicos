from collections.abc import Callable
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_central_db
from app.repositories.permission_repository import PermissionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthenticatedUser, UserRole


def get_current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "user", None)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(
        *allowed_roles: UserRole,
) -> Callable[..., AuthenticatedUser]:
    allowed = set(allowed_roles)

    def role_dependency(
            current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.roles.isdisjoint(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No posee permisos suficientes",
            )
        return current_user
    return role_dependency


def require_permission(
    module: str,
    action: str,
) -> Callable[..., AuthenticatedUser]:
    async def permission_dependency(
        current_user: AuthenticatedUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_central_db),
    ) -> AuthenticatedUser:
        target = f"{module}.{action}"

        if current_user.is_demo:
            role = next(iter(current_user.roles)).value if current_user.roles else "operador"
            perm_repo = PermissionRepository(db)
            perms = await perm_repo.get_effective_permissions(0, role)
        else:
            user_repo = UserRepository(db)
            user = await user_repo.get_by_id(int(current_user.subject))
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
            perm_repo = PermissionRepository(db)
            perms = await perm_repo.get_effective_permissions(user.user_id, user.role)

        if target not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado: {module}.{action}",
            )
        return current_user

    return permission_dependency