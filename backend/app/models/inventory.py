from datetime import datetime
from typing import Any
from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.models.base import Base

class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "nike_logistica"}

    organization_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(20))
    industry: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(80), default="Peru")
    status: Mapped[str | None] = mapped_column(String(30), default="active")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    warehouses = relationship("Warehouse", back_populates="organization", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="organization", cascade="all, delete-orphan")
    inventories = relationship("Inventory", back_populates="organization", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "nike_logistica"}

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Relationships
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = {"schema": "nike_logistica"}

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.categories.category_id"))
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    barcode: Mapped[str | None] = mapped_column(String(50), unique=True)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    model: Mapped[str | None] = mapped_column(String(100))
    gender: Mapped[str | None] = mapped_column(String(20), default="Unisex")
    size: Mapped[str | None] = mapped_column(String(20))
    color: Mapped[str | None] = mapped_column(String(50))
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(30), default="active")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="products")
    category = relationship("Category", back_populates="products")
    embeddings = relationship("ProductEmbedding", back_populates="product", cascade="all, delete-orphan")
    inventories = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")


class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = {"schema": "nike_logistica"}

    warehouse_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    warehouse_name: Mapped[str] = mapped_column(String(150), nullable=False)
    city: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 6))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 6))
    capacity: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(30), default="active")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="warehouses")
    inventories = relationship("Inventory", back_populates="warehouse", cascade="all, delete-orphan")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("product_id", "warehouse_id"),
        {"schema": "nike_logistica"}
    )

    inventory_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id", ondelete="CASCADE"), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id", ondelete="CASCADE"), nullable=False)
    stock_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_stock: Mapped[int | None] = mapped_column(Integer, default=500)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="inventories")
    product = relationship("Product", back_populates="inventories")
    warehouse = relationship("Warehouse", back_populates="inventories")


class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"
    __table_args__ = {"schema": "nike_logistica"}

    embedding_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id", ondelete="CASCADE"), nullable=False)
    description_vector = mapped_column(Vector(384))  # vector(384) from pgvector
    context_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="embeddings")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = {"schema": "nike_logistica"}

    movement_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id"), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    performed_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.users.user_id", ondelete="SET NULL"))
    movement_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)


class TransferOrder(Base):
    __tablename__ = "transfer_orders"
    __table_args__ = {"schema": "nike_logistica"}

    transfer_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id"), nullable=False)
    from_warehouse_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id"), nullable=False)
    to_warehouse_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str | None] = mapped_column(String(30), default="pending")
    requested_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.users.user_id", ondelete="SET NULL"))
    approved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.users.user_id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)
    requested_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)


class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = {"schema": "nike_logistica"}

    supplier_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(80))
    supplier_type: Mapped[str | None] = mapped_column(String(50), default="distributor")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = {"schema": "nike_logistica"}

    purchase_order_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    supplier_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.suppliers.supplier_id"))
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expected_date: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str | None] = mapped_column(String(30), default="pending")
    total_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text)


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    __table_args__ = {"schema": "nike_logistica"}

    purchase_order_item_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.purchase_orders.purchase_order_id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {"schema": "nike_logistica"}

    customer_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(Text)
    customer_type: Mapped[str | None] = mapped_column(String(30), default="retail")


class SalesOrder(Base):
    __tablename__ = "sales_orders"
    __table_args__ = {"schema": "nike_logistica"}

    sales_order_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.customers.customer_id"))
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str | None] = mapped_column(String(30), default="pending")
    total_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0)
    channel: Mapped[str | None] = mapped_column(String(30), default="direct")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"
    __table_args__ = {"schema": "nike_logistica"}

    sales_order_item_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sales_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.sales_orders.sales_order_id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.products.product_id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[float | None] = mapped_column(Numeric(5, 2), default=0)


class Route(Base):
    __tablename__ = "routes"
    __table_args__ = {"schema": "nike_logistica"}

    route_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    route_name: Mapped[str | None] = mapped_column(String(100))
    origin_city: Mapped[str] = mapped_column(String(80), nullable=False)
    destination_city: Mapped[str] = mapped_column(String(80), nullable=False)
    estimated_hours: Mapped[float | None] = mapped_column(Numeric(6, 2))
    distance_km: Mapped[float | None] = mapped_column(Numeric(8, 2))
    carrier: Mapped[str | None] = mapped_column(String(100))
    waypoints: Mapped[dict | None] = mapped_column(JSONB)
    is_active: Mapped[bool | None] = mapped_column(default=True)


class Shipment(Base):
    __tablename__ = "shipments"
    __table_args__ = {"schema": "nike_logistica"}

    shipment_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="CASCADE"), nullable=False)
    sales_order_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.sales_orders.sales_order_id"))
    warehouse_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id"))
    destination_warehouse_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.warehouses.warehouse_id"))
    route_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.routes.route_id"))
    shipment_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    estimated_delivery: Mapped[datetime | None] = mapped_column(DateTime)
    actual_delivery: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str | None] = mapped_column(String(30), default="preparacion")
    carrier: Mapped[str | None] = mapped_column(String(100))
    tracking_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    vehicle_type: Mapped[str | None] = mapped_column(String(30), default="truck")
    estimated_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    product_name: Mapped[str | None] = mapped_column(String(150))
    quantity: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
