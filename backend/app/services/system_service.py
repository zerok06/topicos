from app.core.database import (
    CentralSessionLocal,
    RetailSessionLocal,
    SedeSessionLocal,
    SupplySessionLocal,
    check_database_connection,
)


class SystemService:
    """Servicio encargado de verificar el estado de la infraestructura."""

    async def database_status(self) -> dict[str, str]:
        central = await check_database_connection(CentralSessionLocal)
        sede = await check_database_connection(SedeSessionLocal)
        retail = await check_database_connection(RetailSessionLocal)
        supply = await check_database_connection(SupplySessionLocal)

        return {
            "central": "up" if central else "down",
            "sede": "up" if sede else "down",
            "retail": "up" if retail else "down",
            "supply": "up" if supply else "down",
        }