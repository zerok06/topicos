from fastapi import APIRouter
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.auth import router as auth
from app.api.v1.routes.system import router as system_router
from app.api.v1.routes.chat import router as chat_router
from app.api.v1.routes.stock import router as stock_router
from app.api.v1.routes.metrics import router as metrics_router
from app.api.v1.routes.products import router as products_router
from app.api.v1.routes.permissions import router as permissions_router
from app.api.v1.routes.tracking import router as tracking_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth)
api_router.include_router(system_router)
api_router.include_router(chat_router)
api_router.include_router(stock_router)
api_router.include_router(metrics_router)
api_router.include_router(products_router)
api_router.include_router(permissions_router)
api_router.include_router(tracking_router)