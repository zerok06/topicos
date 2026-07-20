import csv
import io
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_central_db
from app.services.metrics_service import MetricsService
from app.api.deps.auth import require_roles
from app.schemas.auth import AuthenticatedUser, UserRole
from app.models.inventory import Warehouse, Category

router = APIRouter(
    prefix="/metrics",
    tags=["Metrics"]
)


@router.get("/summary")
async def get_metrics_summary(
    days: int = Query(7, ge=1, le=90),
    warehouse_id: int | None = Query(None),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> dict:
    service = MetricsService(db)
    return await service.get_summary(warehouse_id=warehouse_id, category=category)


@router.get("/warehouse-performance")
async def get_warehouse_performance(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_warehouse_performance()


@router.get("/trends")
async def get_movement_trends(
    days: int = Query(7, ge=1, le=90),
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_movement_trends(days, warehouse_id)


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_top_products(limit)


@router.get("/category-distribution")
async def get_category_distribution(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_category_distribution()


@router.get("/alerts")
async def get_alerts(
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_alerts(warehouse_id)


@router.get("/shipments")
async def get_shipment_stats(
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> dict:
    service = MetricsService(db)
    return await service.get_shipment_stats(warehouse_id=warehouse_id)


@router.get("/stock-by-warehouse")
async def get_stock_by_warehouse(
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    service = MetricsService(db)
    return await service.get_stock_by_warehouse(warehouse_id=warehouse_id)


@router.get("/warehouses")
async def list_warehouses(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    result = await db.execute(
        select(Warehouse.warehouse_id, Warehouse.warehouse_name, Warehouse.city, Warehouse.latitude, Warehouse.longitude)
        .order_by(Warehouse.warehouse_name)
    )
    return [
        {
            "id": r.warehouse_id,
            "name": r.warehouse_name,
            "city": r.city,
            "lat": float(r.latitude) if r.latitude else None,
            "lng": float(r.longitude) if r.longitude else None,
        }
        for r in result.all()
    ]


@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    result = await db.execute(
        select(Category.category_id, Category.name)
        .order_by(Category.name)
    )
    return [{"id": r.category_id, "name": r.name} for r in result.all()]


@router.get("/export/csv")
async def export_csv(
    type: str = Query("all", pattern="^(inventory|logistics|all)$"),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)
    ),
) -> StreamingResponse:
    service = MetricsService(db)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    if type in ("inventory", "all"):
        writer.writerow(["=== INVENTARIO ==="])
        writer.writerow(["Metrica", "Valor"])
        summary = await service.get_summary()
        for k, v in summary.items():
            writer.writerow([k, v])
        writer.writerow([])

        writer.writerow(["=== STOCK POR ALMACEN ==="])
        writer.writerow(["Almacen", "Ciudad", "Total", "Critico", "Normal"])
        for w in await service.get_stock_by_warehouse():
            writer.writerow([w["name"], w["city"], w["total"], w["critical"], w["normal"]])
        writer.writerow([])

        writer.writerow(["=== TOP PRODUCTOS ==="])
        writer.writerow(["SKU", "Producto", "Precio", "Stock Total", "Valor"])
        for p in await service.get_top_products(20):
            writer.writerow([p["sku"], p["product_name"], p["unit_price"], p["total_stock"], p["value"]])
        writer.writerow([])

    if type in ("logistics", "all"):
        writer.writerow(["=== LOGISTICA ==="])
        writer.writerow(["Almacen", "Ciudad", "Capacidad", "Stock", "Utilizacion %", "Productos", "Criticos"])
        for w in await service.get_warehouse_performance():
            writer.writerow([w["warehouse_name"], w["city"], w["capacity"], w["total_stock"], w["utilization"], w["product_count"], w["critical_count"]])
        writer.writerow([])

        writer.writerow(["=== ESTADISTICAS DE ENVIOS ==="])
        ship_stats = await service.get_shipment_stats()
        writer.writerow(["Estado", "Cantidad"])
        for status, count in ship_stats["by_status"].items():
            writer.writerow([status, count])
        writer.writerow([])
        writer.writerow(["Transportista", "Cantidad"])
        for carrier, count in ship_stats["by_carrier"].items():
            writer.writerow([carrier, count])
        writer.writerow([])
        writer.writerow(["=== RUTAS ==="])
        writer.writerow(["Ruta", "Origen", "Destino", "Distancia (km)", "Horas Estimadas", "Transportista"])
        for r in ship_stats["routes"]:
            writer.writerow([r["route_name"], r["origin"], r["destination"], r["distance_km"], r["estimated_hours"], r["carrier"]])
        writer.writerow([])

        writer.writerow(["=== ALERTAS ==="])
        writer.writerow(["Tipo", "Severidad", "Titulo", "Descripcion"])
        for a in await service.get_alerts():
            writer.writerow([a["type"], a["severity"], a["title"], a["description"]])

    output.seek(0)
    filename = f"metrics_{type}_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
