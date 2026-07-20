from typing import Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def create(self, email: str, username: str, password_hash: str, role: str, warehouse_id: int | None = None) -> User:
        user = User(
            email=email,
            username=username,
            password_hash=password_hash,
            role=role,
            warehouse_id=warehouse_id,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def list_all(self) -> list[User]:
        result = await self.session.execute(select(User).order_by(User.user_id))
        return list(result.scalars().all())

    async def update_role(self, user_id: int, role: str) -> None:
        await self.session.execute(
            update(User).where(User.user_id == user_id).values(role=role)
        )

    async def set_active(self, user_id: int, is_active: bool) -> None:
        await self.session.execute(
            update(User).where(User.user_id == user_id).values(is_active=is_active)
        )

    async def update_password(self, user_id: int, password_hash: str) -> None:
        await self.session.execute(
            update(User).where(User.user_id == user_id).values(password_hash=password_hash)
        )

    async def update(self, user_id: int, **kwargs: Any) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(user, key):
                setattr(user, key, value)
        await self.session.flush()
        return user

    async def delete(self, user_id: int) -> bool:
        user = await self.get_by_id(user_id)
        if user is None:
            return False
        await self.session.delete(user)
        await self.session.flush()
        return True
