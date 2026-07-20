from datetime import datetime
from typing import Any
from sqlalchemy import Column, Integer, String, BigInteger, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "nike_logistica"}

    audit_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.organizations.organization_id", ondelete="SET NULL"))
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("nike_logistica.users.user_id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(150), nullable=False)
    entity_name: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(Text)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
