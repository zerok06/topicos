from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from app.core.config import settings


central_engine = create_async_engine(
    settings.database_url_central,
    pool_pre_ping=True,
    connect_args={
        "server_settings": {
            "search_path": "nike_logistica",
        }
    }
)

sede_engine = create_async_engine(
    settings.database_url_sede,
    pool_pre_ping=True,
    connect_args={
        "server_settings": {
            "search_path": "nike_sede_peru",
        },
    },
)

retail_engine = create_async_engine(
    settings.database_url_retail,
    pool_pre_ping=True,
    connect_args={
        "server_settings": {
            "search_path": "nike_retail",
        },
    },
)

supply_engine = create_async_engine(
    settings.database_url_supply,
    pool_pre_ping=True,
    connect_args={
        "server_settings": {
            "search_path": "nike_supply_chain",
        },
    },
)


CentralSessionLocal = async_sessionmaker(
    bind=central_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

SedeSessionLocal = async_sessionmaker(
    bind=sede_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

RetailSessionLocal = async_sessionmaker(
    bind=retail_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

SupplySessionLocal = async_sessionmaker(
    bind=supply_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_central_db() -> AsyncGenerator[AsyncSession, None]:
    async with CentralSessionLocal() as session:
        yield session


async def get_sede_db() -> AsyncGenerator[AsyncSession, None]:
    async with SedeSessionLocal() as session:
        yield session


async def get_retail_db() -> AsyncGenerator[AsyncSession, None]:
    async with RetailSessionLocal() as session:
        yield session


async def get_supply_db() -> AsyncGenerator[AsyncSession, None]:
    async with SupplySessionLocal() as session:
        yield session


async def check_database_connection(
    session_factory: async_sessionmaker[AsyncSession],
) -> bool:
    try:
        async with session_factory() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar_one() == 1

    except Exception:
        return False