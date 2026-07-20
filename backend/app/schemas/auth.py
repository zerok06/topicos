from enum import StrEnum
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime


class UserRole(StrEnum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    OPERATOR = "operador"


class AuthenticatedUser(BaseModel):
    subject: str
    email: str | None = None
    username: str | None = None
    roles: set[UserRole] = Field(default_factory=set)
    is_demo: bool = False


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.OPERATOR
    warehouse_id: int | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email: str
    username: str
    role: str
    warehouse_id: int | None = None
    is_active: bool
    created_at: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=100)
    role: UserRole | None = None
    warehouse_id: int | None = None
    is_active: bool | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class KeycloakExchangeCode(BaseModel):
    code: str
    redirect_uri: str


class TokenData(BaseModel):
    user_id: int | None = None
    email: str | None = None
    role: str | None = None
