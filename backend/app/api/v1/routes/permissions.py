from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_central_db
from app.api.deps.auth import require_roles, get_current_user
from app.repositories.permission_repository import PermissionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthenticatedUser, UserRole

router = APIRouter(
    prefix="/auth",
    tags=["Permissions"],
)


class PermissionResponse(BaseModel):
    model_config = {"from_attributes": True}

    permission_id: int
    module: str
    action: str
    label: str
    description: str | None


class UserPermissionsResponse(BaseModel):
    user_id: int
    permissions: list[str]


class SetUserPermissionRequest(BaseModel):
    permission_id: int
    granted: bool


class SetUserPermissionsRequest(BaseModel):
    permissions: list[SetUserPermissionRequest]


@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN)),
) -> list[PermissionResponse]:
    repo = PermissionRepository(db)
    perms = await repo.list_all()
    return [PermissionResponse.from_attributes(p) for p in perms]


@router.post("/permissions/seed", response_model=dict[str, str])
async def seed_permissions(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, str]:
    repo = PermissionRepository(db)
    await repo.seed_defaults()
    await db.commit()
    return {"message": "Permisos por defecto creados correctamente"}


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_effective_permissions(
    user_id: int,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN)),
) -> UserPermissionsResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    perm_repo = PermissionRepository(db)
    perms = await perm_repo.get_effective_permissions(user_id, user.role)
    return UserPermissionsResponse(user_id=user_id, permissions=perms)


@router.put("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def set_user_permissions(
    user_id: int,
    payload: SetUserPermissionsRequest,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN)),
) -> UserPermissionsResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    perm_repo = PermissionRepository(db)
    await perm_repo.clear_user_permissions(user_id)
    for item in payload.permissions:
        await perm_repo.set_user_permission(user_id, item.permission_id, item.granted)

    await db.commit()
    perms = await perm_repo.get_effective_permissions(user_id, user.role)
    return UserPermissionsResponse(user_id=user_id, permissions=perms)


@router.get("/my-permissions", response_model=list[str])
async def get_my_permissions(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[str]:
    if current_user.is_demo:
        role = next(iter(current_user.roles)).value if current_user.roles else "operador"
        perm_repo = PermissionRepository(db)
        return await perm_repo.get_effective_permissions(0, role)

    perm_repo = PermissionRepository(db)
    return await perm_repo.get_effective_permissions(
        int(current_user.subject),
        current_user.roles.pop().value if current_user.roles else "operador",
    )
