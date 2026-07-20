from typing import Sequence
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import Inventory, Product, ProductEmbedding, Warehouse

class InventoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_inventory(self, limit: int = 100, offset: int = 0) -> Sequence[Inventory]:
        """Obtiene todo el inventario con sus relaciones cargadas."""
        stmt = (
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.warehouse)
            )
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_inventory_by_warehouse(self, warehouse_id: int) -> Sequence[Inventory]:
        """Obtiene el inventario de un almacén específico."""
        stmt = (
            select(Inventory)
            .where(Inventory.warehouse_id == warehouse_id)
            .options(selectinload(Inventory.product))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_stock(self, product_id: int, warehouse_id: int) -> Inventory | None:
        """Obtiene el registro de inventario para un producto y almacén específico."""
        stmt = (
            select(Inventory)
            .where(
                Inventory.product_id == product_id,
                Inventory.warehouse_id == warehouse_id
            )
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.warehouse)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search_similar_products(self, query_vector: list[float], limit: int = 5) -> Sequence[ProductEmbedding]:
        """Busca productos similares semánticamente utilizando pgvector."""
        stmt = (
            select(ProductEmbedding)
            .options(selectinload(ProductEmbedding.product))
            .order_by(ProductEmbedding.description_vector.cosine_distance(query_vector))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_warehouse_inventory_summary(self) -> list[dict]:
        """Obtiene un resumen de inventario agrupado por almacén."""
        stmt = (
            select(
                Warehouse.warehouse_id,
                Warehouse.warehouse_name,
                Warehouse.city,
                func.count(Inventory.inventory_id).label("product_count"),
                func.sum(Inventory.stock_qty).label("total_stock"),
                func.sum(case((Inventory.stock_qty <= Inventory.min_stock, 1), else_=0)).label("critical_count"),
            )
            .join(Inventory, Inventory.warehouse_id == Warehouse.warehouse_id, isouter=True)
            .group_by(Warehouse.warehouse_id, Warehouse.warehouse_name, Warehouse.city)
            .order_by(func.sum(Inventory.stock_qty).desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [
            {
                "warehouse_id": r.warehouse_id,
                "warehouse_name": r.warehouse_name,
                "city": r.city,
                "product_count": r.product_count or 0,
                "total_stock": int(r.total_stock) if r.total_stock else 0,
                "critical_count": int(r.critical_count) if r.critical_count else 0,
            }
            for r in rows
        ]

    async def get_full_inventory_context(self) -> list[dict]:
        """Obtiene el inventario completo con producto y almacén para contexto del chatbot."""
        stmt = (
            select(Inventory)
            .options(
                selectinload(Inventory.product),
                selectinload(Inventory.warehouse),
            )
            .order_by(Inventory.warehouse_id, Inventory.product_id)
        )
        result = await self.session.execute(stmt)
        inventories = result.scalars().all()
        return [
            {
                "sku": inv.product.sku if inv.product else "",
                "product_name": inv.product.product_name if inv.product else "",
                "model": inv.product.model if inv.product else "",
                "gender": inv.product.gender if inv.product else "",
                "unit_price": float(inv.product.unit_price) if inv.product and inv.product.unit_price else 0.0,
                "warehouse_name": inv.warehouse.warehouse_name if inv.warehouse else "",
                "city": inv.warehouse.city if inv.warehouse else "",
                "stock_qty": inv.stock_qty,
                "min_stock": inv.min_stock,
                "max_stock": inv.max_stock,
                "is_critical": inv.stock_qty <= inv.min_stock,
            }
            for inv in inventories
        ]

    async def get_products_by_barcode(self, barcode: str) -> list[dict]:
        """Busca productos por SKU (codigo de barras) o nombre."""
        stmt = (
            select(Product)
            .where(
                (Product.sku.ilike(f"%{barcode}%"))
                | (Product.product_name.ilike(f"%{barcode}%"))
            )
            .limit(10)
        )
        result = await self.session.execute(stmt)
        products = result.scalars().all()
        return [
            {
                "product_id": p.product_id,
                "sku": p.sku,
                "product_name": p.product_name,
                "model": p.model,
                "unit_price": float(p.unit_price) if p.unit_price else 0.0,
            }
            for p in products
        ]

    async def get_product_stock_by_warehouses(self, product_id: int) -> list[dict]:
        """Obtiene el stock de un producto en todos los almacenes."""
        stmt = (
            select(Inventory)
            .where(Inventory.product_id == product_id)
            .options(selectinload(Inventory.warehouse))
        )
        result = await self.session.execute(stmt)
        inventories = result.scalars().all()
        return [
            {
                "warehouse_name": inv.warehouse.warehouse_name if inv.warehouse else "",
                "city": inv.warehouse.city if inv.warehouse else "",
                "stock_qty": inv.stock_qty,
                "min_stock": inv.min_stock,
                "is_critical": inv.stock_qty <= inv.min_stock,
            }
            for inv in inventories
        ]

    async def update_stock(self, product_id: int, warehouse_id: int, quantity: int) -> Inventory:
        """Actualiza el stock directo o crea el registro si no existe."""
        db_inventory = await self.get_stock(product_id, warehouse_id)
        if db_inventory:
            db_inventory.stock_qty = quantity
        else:
            # Obtener organización del producto para mantener consistencia
            product_stmt = select(Product.organization_id).where(Product.product_id == product_id)
            product_org = (await self.session.execute(product_stmt)).scalar_one()
            
            db_inventory = Inventory(
                organization_id=product_org,
                product_id=product_id,
                warehouse_id=warehouse_id,
                stock_qty=quantity
            )
            self.session.add(db_inventory)
        
        await self.session.flush()
        return db_inventory
