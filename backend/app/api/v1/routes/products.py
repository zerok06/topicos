import re
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_central_db
from app.api.deps.auth import get_current_user, require_roles
from app.schemas.auth import AuthenticatedUser, UserRole
from app.models.inventory import Product, Inventory, Warehouse
from app.models.user import User
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


class ProductCreate(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=150)
    model: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, max_length=20)
    size: str | None = Field(None, max_length=20)
    color: str | None = Field(None, max_length=50)
    unit_price: float = Field(..., gt=0)
    description: str | None = None
    barcode: str | None = Field(None, max_length=50)
    warehouse_id: int | None = None
    warehouse_distribution: list[dict] | None = None


class ProductUpdate(BaseModel):
    product_name: str | None = Field(None, max_length=150)
    model: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, max_length=20)
    size: str | None = Field(None, max_length=20)
    color: str | None = Field(None, max_length=50)
    unit_price: float | None = Field(None, gt=0)
    description: str | None = None


def validate_ean13(barcode: str) -> bool:
    if not re.match(r"^\d{13}$", barcode):
        return False
    digits = [int(d) for d in barcode]
    checksum = sum(d * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits[:-1]))
    expected = (10 - (checksum % 10)) % 10
    return expected == digits[-1]


async def _generate_internal_barcode(db, warehouse_id: int) -> str:
    for _ in range(10):
        suffix = random.randint(1000, 9999)
        barcode = f"INT-{warehouse_id}-{suffix}"
        existing = await db.execute(select(Product).where(Product.barcode == barcode))
        if not existing.scalar_one_or_none():
            return barcode
    raise HTTPException(status_code=500, detail="No se pudo generar un codigo de barras unico")


async def _generate_sku(db, warehouse_id: int) -> str:
    count = await db.scalar(select(func.count(Product.product_id)))
    return f"NK-{warehouse_id}-{count + 1:04d}"


@router.get("/")
async def list_products(
    search: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)),
):
    service = ProductService(db)
    return await service.list_products(search=search, warehouse_id=warehouse_id, category=category)


@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)),
):
    service = ProductService(db)
    product = await service.get_product_detail(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)),
):
    service = ProductService(db)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")
    product = await service.update_product(product_id, update_data)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("/")
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)),
):
    warehouse_id = data.warehouse_id
    distribution = data.warehouse_distribution

    if warehouse_id is None and (not distribution):
        if current_user.is_demo:
            raise HTTPException(
                status_code=400,
                detail="Modo demo: debe especificar warehouse_id o warehouse_distribution"
            )
        user_stmt = select(User).where(User.user_id == int(current_user.subject))
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if not user or not user.warehouse_id:
            raise HTTPException(status_code=400, detail="El usuario no tiene un almacen asignado")
        warehouse_id = user.warehouse_id

    if data.barcode:
        if not re.match(r"^\d{13}$", data.barcode):
            raise HTTPException(status_code=400, detail="El codigo de barras debe tener 13 digitos (EAN-13)")
        digits = [int(d) for d in data.barcode]
        checksum = sum(d * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits[:-1]))
        expected = (10 - (checksum % 10)) % 10
        if expected != digits[-1]:
            raise HTTPException(status_code=400, detail="El codigo de barras EAN-13 no es valido (checksum incorrecto)")
        existing = await db.execute(select(Product).where(Product.barcode == data.barcode))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un producto con ese codigo de barras")

    if not distribution:
        wh_check = await db.execute(select(Warehouse).where(Warehouse.warehouse_id == warehouse_id))
        if not wh_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Almacen no encontrado")
        org_stmt = select(Warehouse.organization_id).where(Warehouse.warehouse_id == warehouse_id)
        organization_id = (await db.execute(org_stmt)).scalar_one()
    else:
        first_wh = await db.execute(select(Warehouse).where(Warehouse.warehouse_id == distribution[0]["warehouse_id"]))
        first = first_wh.scalar_one_or_none()
        if not first:
            raise HTTPException(status_code=404, detail="Almacen no encontrado en la distribucion")
        organization_id = first.organization_id
        warehouse_id = distribution[0]["warehouse_id"]

    sku = await _generate_sku(db, warehouse_id)

    barcode = data.barcode
    if not barcode:
        barcode = await _generate_internal_barcode(db, warehouse_id)

    product_data = {
        "organization_id": organization_id,
        "sku": sku,
        "barcode": barcode,
        "product_name": data.product_name,
        "model": data.model,
        "gender": data.gender,
        "size": data.size,
        "color": data.color,
        "unit_price": data.unit_price,
        "description": data.description,
    }

    if distribution:
        service = ProductService(db)
        result = await service.create_with_distribution(product_data, distribution)
        return result
    else:
        product = Product(**product_data)
        db.add(product)
        await db.flush()

        inventory = Inventory(
            organization_id=organization_id,
            product_id=product.product_id,
            warehouse_id=warehouse_id,
            stock_qty=0,
        )
        db.add(inventory)
        await db.commit()
        await db.refresh(product)

        return {
            "product_id": product.product_id,
            "sku": product.sku,
            "barcode": product.barcode,
            "product_name": product.product_name,
            "model": product.model,
            "gender": product.gender,
            "size": product.size,
            "color": product.color,
            "unit_price": float(product.unit_price),
            "description": product.description,
            "warehouse_id": warehouse_id,
            "stock_qty": 0,
        }
