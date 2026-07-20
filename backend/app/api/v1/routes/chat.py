from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_central_db
from app.services.chatbot_service import ask_logistics_chatbot
from app.repositories.inventory_repository import InventoryRepository
from app.api.deps.auth import require_roles
from app.schemas.auth import AuthenticatedUser, UserRole

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"]
)

class ChatQuery(BaseModel):
    message: str

class ChatReply(BaseModel):
    response: str

class BarcodeQuery(BaseModel):
    barcode: str

class BarcodeResult(BaseModel):
    sku: str
    product_name: str
    model: str | None
    unit_price: float
    stock_by_warehouse: list[dict]

@router.post("/", response_model=ChatReply)
async def chat_with_agent(
    query: ChatQuery,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> ChatReply:
    """Endpoint para interactuar con el asistente logistico utilizando RAG (pgvector) y cache semantica (Redis)."""
    response_text = await ask_logistics_chatbot(query.message, db)
    return ChatReply(response=response_text)

@router.post("/barcode", response_model=list[BarcodeResult])
async def search_by_barcode(
    query: BarcodeQuery,
    db: AsyncSession = Depends(get_central_db),
    current_user: AuthenticatedUser = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR)
    ),
) -> list[BarcodeResult]:
    """Busca productos por codigo de barras / SKU y devuelve stock por almacen."""
    inv_repo = InventoryRepository(db)
    products = await inv_repo.get_products_by_barcode(query.barcode)
    
    results = []
    for p in products:
        stock_info = await inv_repo.get_product_stock_by_warehouses(p["product_id"])
        results.append(BarcodeResult(
            sku=p["sku"],
            product_name=p["product_name"],
            model=p["model"],
            unit_price=p["unit_price"],
            stock_by_warehouse=stock_info,
        ))
    return results
