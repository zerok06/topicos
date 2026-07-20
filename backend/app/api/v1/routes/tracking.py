from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_central_db
from app.api.deps.auth import require_roles, get_current_user
from app.schemas.auth import AuthenticatedUser, UserRole
from app.models.inventory import Shipment, Route, Warehouse

router = APIRouter(
    prefix="/tracking",
    tags=["Tracking"]
)


def calc_progress(
    shipment_date: datetime | date | None,
    estimated_delivery: datetime | date | None,
) -> int:
    if not shipment_date or not estimated_delivery:
        return 0

    # DB may return date (not datetime) — convert for subtraction
    if isinstance(shipment_date, date) and not isinstance(shipment_date, datetime):
        shipment_date = datetime.combine(shipment_date, datetime.min.time())
    if isinstance(estimated_delivery, date) and not isinstance(estimated_delivery, datetime):
        estimated_delivery = datetime.combine(estimated_delivery, datetime.min.time())

    now = datetime.utcnow()
    total_seconds = (estimated_delivery - shipment_date).total_seconds()
    if total_seconds <= 0:
        return 100
    elapsed = (now - shipment_date).total_seconds()
    progress = int((elapsed / total_seconds) * 100)
    return max(0, min(100, progress))


@router.get("/shipments")
async def list_active_shipments(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[dict]:
    """Devuelve todos los envíos activos con datos de origen, destino y progreso."""
    result = await db.execute(
        select(Shipment)
        .where(Shipment.status.in_(["preparacion", "en_transito", "en_destino"]))
        .order_by(Shipment.shipment_date.desc())
    )
    shipments = result.scalars().all()

    response = []
    for s in shipments:
        origin_wh = await db.execute(
            select(Warehouse).where(Warehouse.warehouse_id == s.warehouse_id)
        )
        origin_wh = origin_wh.scalar_one_or_none()

        dest_wh = None
        if s.destination_warehouse_id:
            dest_result = await db.execute(
                select(Warehouse).where(Warehouse.warehouse_id == s.destination_warehouse_id)
            )
            dest_wh = dest_result.scalar_one_or_none()

        route = None
        if s.route_id:
            route_result = await db.execute(
                select(Route).where(Route.route_id == s.route_id)
            )
            route = route_result.scalar_one_or_none()

        waypoints = route.waypoints if route and route.waypoints else None

        response.append({
            "tracking_code": s.tracking_code,
            "status": s.status,
            "shipment_date": s.shipment_date.isoformat() if s.shipment_date else None,
            "estimated_delivery": s.estimated_delivery.isoformat() if s.estimated_delivery else None,
            "actual_delivery": s.actual_delivery.isoformat() if s.actual_delivery else None,
            "origin": {
                "id": origin_wh.warehouse_id if origin_wh else None,
                "name": origin_wh.warehouse_name if origin_wh else None,
                "city": origin_wh.city if origin_wh else None,
                "lat": float(origin_wh.latitude) if origin_wh and origin_wh.latitude else None,
                "lng": float(origin_wh.longitude) if origin_wh and origin_wh.longitude else None,
            } if origin_wh else None,
            "destination": {
                "id": dest_wh.warehouse_id if dest_wh else None,
                "name": dest_wh.warehouse_name if dest_wh else None,
                "city": dest_wh.city if dest_wh else None,
                "lat": float(dest_wh.latitude) if dest_wh and dest_wh.latitude else None,
                "lng": float(dest_wh.longitude) if dest_wh and dest_wh.longitude else None,
            } if dest_wh else None,
            "product_name": s.product_name,
            "quantity": s.quantity,
            "carrier": s.carrier,
            "vehicle_type": s.vehicle_type or "truck",
            "estimated_cost": float(s.estimated_cost) if s.estimated_cost else None,
            "estimated_hours": float(route.estimated_hours) if route and route.estimated_hours else None,
            "distance_km": float(route.distance_km) if route and route.distance_km else None,
            "waypoints": waypoints,
            "progress_percent": calc_progress(s.shipment_date, s.estimated_delivery),
        })

    return response
