import logging
from typing import Optional
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import Product, Inventory, Warehouse, Category

logger = logging.getLogger(__name__)


class ProductService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_products(
        self,
        search: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        query = (
            select(
                Product.product_id,
                Product.sku,
                Product.barcode,
                Product.product_name,
                Product.unit_price,
                func.sum(Inventory.stock_qty).label("total_stock"),
                func.count(Inventory.inventory_id).label("warehouse_count"),
                Product.status,
            )
            .outerjoin(Inventory, Inventory.product_id == Product.product_id)
        )

        if category:
            query = query.join(Category, Product.category_id == Category.category_id).where(Category.name == category)
        if warehouse_id:
            query = query.where(Inventory.warehouse_id == warehouse_id)
        if search:
            like = f"%{search}%"
            query = query.where(
                Product.product_name.ilike(like)
                | Product.sku.ilike(like)
                | Product.barcode.ilike(like)
            )

        query = query.group_by(
            Product.product_id, Product.sku, Product.barcode,
            Product.product_name, Product.unit_price, Product.status
        ).order_by(Product.product_name)

        result = await self.session.execute(query)
        products = []
        for r in result.all():
            products.append({
                "product_id": r.product_id,
                "sku": r.sku,
                "barcode": r.barcode,
                "product_name": r.product_name,
                "unit_price": float(r.unit_price),
                "total_stock": int(r.total_stock or 0),
                "warehouse_count": int(r.warehouse_count or 0),
                "status": r.status,
            })
        return products

    async def get_product_detail(self, product_id: int) -> Optional[dict]:
        result = await self.session.execute(
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.product_id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return None

        result = await self.session.execute(
            select(
                Warehouse.warehouse_id,
                Warehouse.warehouse_name,
                Warehouse.city,
                Inventory.stock_qty,
                Inventory.min_stock,
            )
            .join(Inventory, Inventory.warehouse_id == Warehouse.warehouse_id)
            .where(Inventory.product_id == product_id)
            .order_by(Warehouse.warehouse_name)
        )
        stock_by_warehouse = []
        for r in result.all():
            stock_by_warehouse.append({
                "warehouse_id": r.warehouse_id,
                "warehouse_name": r.warehouse_name,
                "city": r.city,
                "stock_qty": int(r.stock_qty),
                "min_stock": int(r.min_stock),
                "is_critical": int(r.stock_qty) < int(r.min_stock),
            })

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
            "category_id": product.category_id,
            "category_name": product.category.name if product.category else None,
            "status": product.status,
            "created_at": product.created_at.isoformat() if product.created_at else "",
            "stock_by_warehouse": stock_by_warehouse,
        }

    async def update_product(self, product_id: int, data: dict) -> Optional[dict]:
        result = await self.session.execute(
            select(Product).where(Product.product_id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return None

        updatable_fields = [
            "product_name", "model", "gender", "size", "color",
            "unit_price", "description",
        ]
        for field in updatable_fields:
            if field in data:
                setattr(product, field, data[field])

        await self.session.commit()
        return await self.get_product_detail(product_id)

    async def create_with_distribution(self, product_data: dict, warehouse_distribution: list[dict]) -> dict:
        product = Product(**product_data)
        self.session.add(product)
        await self.session.flush()

        for dist in warehouse_distribution:
            inventory = Inventory(
                product_id=product.product_id,
                warehouse_id=dist["warehouse_id"],
                stock_qty=dist.get("stock_qty", 0),
                min_stock=5,
                max_stock=100,
            )
            self.session.add(inventory)

        await self.session.commit()
        detail = await self.get_product_detail(product.product_id)
        return detail or {}
