import random
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_central_db
from app.api.deps.auth import require_roles, get_current_user
from app.schemas.auth import AuthenticatedUser, UserRole
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.audit_repository import AuditRepository
from app.models.inventory import Shipment, Route, Warehouse

router = APIRouter(
    prefix="/stock",
    tags=["Stock"]
)

# Pydantic Schemas
class InventoryItemResponse(BaseModel):
    inventory_id: int
    product_id: int
    warehouse_id: int
    sku: str
    product_name: str
    warehouse_name: str
    city: str | None
    stock_qty: int
    min_stock: int
    max_stock: int | None

    class Config:
        from_attributes = True

VEHICLE_COST_PER_KM = {
    "truck": 2.5,
    "van": 1.8,
    "bike": 0.5,
}

class TransferRequest(BaseModel):
    product_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: int = Field(..., gt=0, description="Cantidad a transferir (debe ser mayor a 0)")
    vehicle_type: str = Field(default="truck", description="truck | van | bike")

class AuditLogResponse(BaseModel):
    audit_id: int
    action: str
    user_email: str | None
    details: dict[str, Any]
    created_at: Any

    class Config:
        from_attributes = True

class PaginatedAuditResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    limit: int
    pages: int

class AuditSummaryResponse(BaseModel):
    total: int
    today_count: int
    action_types: list[str]
    last_activity: str | None


@router.get("/", response_model=list[InventoryItemResponse])
async def list_stock(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR))
) -> list[InventoryItemResponse]:
    """Obtiene la lista completa de stock disponible."""
    inv_repo = InventoryRepository(db)
    items = await inv_repo.get_all_inventory()
    
    response = []
    for item in items:
        response.append(
            InventoryItemResponse(
                inventory_id=item.inventory_id,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                sku=item.product.sku,
                product_name=item.product.product_name,
                warehouse_name=item.warehouse.warehouse_name,
                city=item.warehouse.city,
                stock_qty=item.stock_qty,
                min_stock=item.min_stock,
                max_stock=item.max_stock
            )
        )
    return response


@router.post("/transfer")
async def transfer_stock(
    payload: TransferRequest,
    db: AsyncSession = Depends(get_central_db),
    # Solo Administrador y Supervisor pueden modificar stock. Operador recibe 403.
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR))
) -> dict[str, str]:
    """Realiza la transferencia de stock entre almacenes y registra la auditoría (requiere Admin o Supervisor)."""
    inv_repo = InventoryRepository(db)
    audit_repo = AuditRepository(db)

    # 0. Validar que ambos almacenes existen
    origin_wh = await db.execute(
        select(Warehouse).where(Warehouse.warehouse_id == payload.from_warehouse_id)
    )
    origin_wh = origin_wh.scalar_one_or_none()
    if not origin_wh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Almacén de origen (ID {payload.from_warehouse_id}) no encontrado."
        )

    dest_wh = await db.execute(
        select(Warehouse).where(Warehouse.warehouse_id == payload.to_warehouse_id)
    )
    dest_wh = dest_wh.scalar_one_or_none()
    if not dest_wh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Almacén de destino (ID {payload.to_warehouse_id}) no encontrado."
        )

    # 1. Verificar stock en origen
    origin_stock = await inv_repo.get_stock(payload.product_id, payload.from_warehouse_id)
    if not origin_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay registro de stock para el producto (ID {payload.product_id}) en el almacén de origen ({origin_wh.warehouse_name})."
        )
    if origin_stock.stock_qty < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock insuficiente en {origin_wh.warehouse_name}. Disponible: {origin_stock.stock_qty}, solicitado: {payload.quantity}."
        )
        
    # 2. Descontar en origen
    await inv_repo.update_stock(
        payload.product_id,
        payload.from_warehouse_id,
        origin_stock.stock_qty - payload.quantity
    )
    
    # 3. Incrementar en destino
    dest_stock = await inv_repo.get_stock(payload.product_id, payload.to_warehouse_id)
    dest_qty = (dest_stock.stock_qty if dest_stock else 0) + payload.quantity
    await inv_repo.update_stock(
        payload.product_id,
        payload.to_warehouse_id,
        dest_qty
    )
    
    # 4. Registrar en Auditoría (Detalles en JSONB como requiere el SDD/Prompt)
    audit_details = {
        "product_id": payload.product_id,
        "from_warehouse_id": payload.from_warehouse_id,
        "to_warehouse_id": payload.to_warehouse_id,
        "quantity": payload.quantity,
        "vehicle_type": payload.vehicle_type,
        "user_email": current_user.email
    }
    
    user_id_val = None
    subject_cleaned = current_user.subject.replace("demo-", "")
    if current_user.is_demo and subject_cleaned.isdigit():
        user_id_val = int(subject_cleaned)
        
    await audit_repo.create_log(
        action="TRASLADO_CONFIRMADO",
        user_id=user_id_val,
        entity_name="inventory",
        entity_id=str(payload.product_id),
        details=audit_details
    )
    
    # 5. Crear Shipment para tracking
    tracking_code = f"TRK-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    org_id = origin_stock.organization_id
    product_name = origin_stock.product.product_name if origin_stock.product else "Producto"
    
    # Buscar ruta entre almacenes
    route = None
    estimated_delivery = datetime.utcnow() + timedelta(days=3)
    carrier = "Transporte Propio"
    distance_km = None
    estimated_hours = None
    
    if origin_wh and dest_wh and origin_wh.city and dest_wh.city:
        route_result = await db.execute(
            select(Route).where(
                Route.origin_city == origin_wh.city,
                Route.destination_city == dest_wh.city,
                Route.is_active == True
            ).limit(1)
        )
        route = route_result.scalar_one_or_none()
        
        if route and route.estimated_hours:
            estimated_hours = float(route.estimated_hours)
            estimated_delivery = datetime.utcnow() + timedelta(hours=estimated_hours)
            carrier = route.carrier or "Transporte Propio"
            distance_km = float(route.distance_km) if route.distance_km else None
    
    # Calcular costo estimado
    cost_per_km = VEHICLE_COST_PER_KM.get(payload.vehicle_type, 2.5)
    estimated_cost = (distance_km * cost_per_km) if distance_km else None
    
    shipment = Shipment(
        organization_id=org_id,
        warehouse_id=payload.from_warehouse_id,
        destination_warehouse_id=payload.to_warehouse_id,
        route_id=route.route_id if route else None,
        shipment_date=datetime.utcnow(),
        estimated_delivery=estimated_delivery,
        status="en_transito",
        carrier=carrier,
        tracking_code=tracking_code,
        vehicle_type=payload.vehicle_type,
        estimated_cost=estimated_cost,
        product_name=product_name,
        quantity=payload.quantity,
        notes=f"Transferencia de {payload.quantity} unidades de {product_name} desde {origin_wh.warehouse_name if origin_wh else '?'} hasta {dest_wh.warehouse_name if dest_wh else '?'}"
    )
    db.add(shipment)
    
    await db.commit()
    return {
        "message": "Transferencia realizada con éxito y registrada en auditoría.",
        "tracking_code": tracking_code
    }


@router.get("/audit-logs", response_model=PaginatedAuditResponse)
async def get_audit_trail(
    db: AsyncSession = Depends(get_central_db),
    page: int = 1,
    limit: int = 25,
    action: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR))
) -> PaginatedAuditResponse:
    """Obtiene el historial de auditoría paginado (solo Admin y Supervisor)."""
    audit_repo = AuditRepository(db)
    offset = (page - 1) * limit
    logs = await audit_repo.get_logs(limit=limit, offset=offset, action=action, date_from=date_from, date_to=date_to)
    total = await audit_repo.get_logs_count(action=action, date_from=date_from, date_to=date_to)
    
    log_responses = []
    for log in logs:
        user_email = log.details.get("user_email") if log.details else "Sistema"
        log_responses.append(
            AuditLogResponse(
                audit_id=log.audit_id,
                action=log.action,
                user_email=user_email,
                details=log.details or {},
                created_at=log.created_at
            )
        )
    
    return PaginatedAuditResponse(
        logs=log_responses,
        total=total,
        page=page,
        limit=limit,
        pages=max(1, (total + limit - 1) // limit)
    )


@router.get("/audit-summary", response_model=AuditSummaryResponse)
async def get_audit_summary(
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR))
) -> AuditSummaryResponse:
    """Obtiene resumen de auditoría (solo Admin y Supervisor)."""
    audit_repo = AuditRepository(db)
    summary = await audit_repo.get_summary()
    return AuditSummaryResponse(**summary)
