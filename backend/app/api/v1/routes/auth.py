from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_central_db
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.keycloak import (
    exchange_code_for_token,
    get_or_create_user_from_keycloak,
    verify_keycloak_token,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.api.deps.auth import get_current_user, require_roles, require_permission
from app.schemas.auth import (
    AuthenticatedUser,
    ChangePasswordRequest,
    KeycloakExchangeCode,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserRole,
    UserUpdate,
)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        username=user.username,
        role=user.role,
        warehouse_id=user.warehouse_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _build_token_response(user: User) -> TokenResponse:
    token_data = {"sub": str(user.user_id), "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=_user_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_central_db),
) -> TokenResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(credentials.email)

    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Contacta al administrador.",
        )

    return _build_token_response(user)


@router.post("/keycloak/exchange", response_model=TokenResponse)
async def keycloak_exchange(
    payload: KeycloakExchangeCode,
    db: AsyncSession = Depends(get_central_db),
) -> TokenResponse:
    if not settings.keycloak_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keycloak no está habilitado",
        )

    token_data = await exchange_code_for_token(payload.code, payload.redirect_uri)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de autorización inválido o expirado",
        )

    access_token = token_data.get("access_token", "")
    token_info = await verify_keycloak_token(access_token)
    if token_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Keycloak inválido",
        )

    try:
        user, _ = await get_or_create_user_from_keycloak(token_info, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Contacta al administrador.",
        )

    return _build_token_response(user)


@router.post("/register", response_model=TokenResponse)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_central_db),
) -> TokenResponse:
    user_repo = UserRepository(db)

    existing_email = await user_repo.get_by_email(data.email)
    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        )

    existing_username = await user_repo.get_by_username(data.username)
    if existing_username is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese username",
        )

    hashed = hash_password(data.password)
    user = await user_repo.create(
        email=data.email,
        username=data.username,
        password_hash=hashed,
        role=data.role.value,
    )
    await db.commit()
    return _build_token_response(user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_central_db),
) -> UserResponse:
    if current_user.is_demo:
        return UserResponse(
            user_id=0,
            email=current_user.email or "",
            username=current_user.username or "",
            role=next(iter(current_user.roles)).value if current_user.roles else "operador",
            is_active=True,
            created_at=None,
        )

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(int(current_user.subject))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return _user_to_response(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_central_db),
) -> TokenResponse:
    token_data = decode_token(payload.refresh_token)
    if token_data is None or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresco inválido o expirado",
        )

    user_id = int(token_data["sub"])
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido",
        )

    return _build_token_response(user)


@router.post("/logout")
async def logout(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, str]:
    return {"message": "Sesión cerrada correctamente"}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "view")),
) -> list[UserResponse]:
    user_repo = UserRepository(db)
    users = await user_repo.list_all()
    return [_user_to_response(u) for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "view")),
) -> UserResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return _user_to_response(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "edit")),
) -> UserResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    update_kwargs = data.model_dump(exclude_none=True)
    if "role" in update_kwargs:
        update_kwargs["role"] = update_kwargs["role"].value if update_kwargs["role"] else None

    if "email" in update_kwargs and update_kwargs["email"] != user.email:
        existing = await user_repo.get_by_email(update_kwargs["email"])
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya en uso")

    if "username" in update_kwargs and update_kwargs["username"] != user.username:
        existing = await user_repo.get_by_username(update_kwargs["username"])
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username ya en uso")

    updated = await user_repo.update(user_id, **update_kwargs)
    await db.commit()
    return _user_to_response(updated)


@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "toggle-active")),
) -> UserResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    new_active = not user.is_active
    await user_repo.set_active(user_id, new_active)
    await db.commit()

    audit_repo = AuditRepository(db)
    await audit_repo.create_log(
        action="USER_TOGGLE_ACTIVE",
        entity_name="user",
        entity_id=str(user_id),
        details={"user_email": current_user.email, "target_user": user.email, "new_active": new_active},
    )
    await db.commit()

    user.is_active = new_active
    return _user_to_response(user)


@router.delete("/users/{user_id}", response_model=dict[str, str])
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "delete")),
) -> dict[str, str]:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    await user_repo.delete(user_id)
    await db.commit()

    audit_repo = AuditRepository(db)
    await audit_repo.create_log(
        action="USER_DELETE",
        entity_name="user",
        entity_id=str(user_id),
        details={"user_email": current_user.email, "target_user": user.email},
    )
    await db.commit()
    return {"message": f"Usuario {user.email} eliminado correctamente"}


@router.post("/change-password", response_model=dict[str, str])
async def change_my_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, str]:
    if current_user.is_demo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuarios demo no pueden cambiar contraseña")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(int(current_user.subject))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")

    new_hash = hash_password(data.new_password)
    await user_repo.update_password(user.user_id, new_hash)
    await db.commit()
    return {"message": "Contraseña actualizada correctamente"}


@router.post("/users/{user_id}/reset-password", response_model=dict[str, str])
async def reset_user_password(
    user_id: int,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_permission("users", "reset-password")),
) -> dict[str, str]:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    new_hash = hash_password(data.new_password)
    await user_repo.update_password(user_id, new_hash)
    await db.commit()

    audit_repo = AuditRepository(db)
    await audit_repo.create_log(
        action="USER_RESET_PASSWORD",
        entity_name="user",
        entity_id=str(user_id),
        details={"user_email": current_user.email, "target_user": user.email},
    )
    await db.commit()
    return {"message": "Contraseña restablecida correctamente"}
