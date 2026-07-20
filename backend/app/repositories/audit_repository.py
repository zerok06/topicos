from typing import Any, Sequence
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(
        self,
        action: str,
        user_id: int | None = None,
        organization_id: int | None = None,
        entity_name: str | None = None,
        entity_id: str | None = None,
        details: dict[str, Any] | None = None
    ) -> AuditLog:
        """Inserta un registro de auditoría inmutable."""
        log = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            details=details or {}
        )
        self.session.add(log)
        await self.session.flush()
        return log

    async def get_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        action: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None
    ) -> Sequence[AuditLog]:
        """Obtiene registros de auditoría ordenados descendentemente por marca de tiempo."""
        conditions = []
        if action:
            conditions.append(AuditLog.action == action)
        if date_from:
            conditions.append(AuditLog.created_at >= date_from)
        if date_to:
            conditions.append(AuditLog.created_at <= date_to)

        stmt = select(AuditLog)
        if conditions:
            stmt = stmt.where(and_(*conditions))
        stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_logs_count(
        self,
        action: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None
    ) -> int:
        conditions = []
        if action:
            conditions.append(AuditLog.action == action)
        if date_from:
            conditions.append(AuditLog.created_at >= date_from)
        if date_to:
            conditions.append(AuditLog.created_at <= date_to)

        stmt = select(func.count(AuditLog.audit_id))
        if conditions:
            stmt = stmt.where(and_(*conditions))

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_summary(self) -> dict[str, Any]:
        total = await self.get_logs_count()
        today = await self.get_logs_count(date_from=func.current_date())

        action_types_stmt = select(AuditLog.action).distinct()
        action_result = await self.session.execute(action_types_stmt)
        action_types = [row[0] for row in action_result.all()]

        last_stmt = select(AuditLog.created_at).order_by(AuditLog.created_at.desc()).limit(1)
        last_result = await self.session.execute(last_stmt)
        last_activity = last_result.scalar()

        return {
            "total": total,
            "today_count": today,
            "action_types": action_types,
            "last_activity": last_activity.isoformat() if last_activity else None
        }
