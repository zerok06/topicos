from fastapi import APIRouter

from app.services.system_service import SystemService

router = APIRouter(
    prefix="/system",
    tags=["System"],
)

system_service = SystemService()


@router.get("/database")
async def database_status() -> dict[str, dict[str, str]]:

    status = await system_service.database_status()

    return {
        "databases": status,
    }