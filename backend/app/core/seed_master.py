"""
Seed maestro: ejecuta todo el setup inicial del sistema.

1. Crea las tablas de permisos si no existen (via SQLAlchemy)
2. Crea permisos (26) y asignaciones por rol (role_permissions)
3. Crea los 3 usuarios demo si no existen
4. Registra en audit_logs cada accion

Uso:
    cd backend
    python -m app.core.seed_master
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import CentralSessionLocal, central_engine
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.permission import Permission, RolePermission, UserPermission
from app.models.audit import AuditLog
from app.repositories.permission_repository import DEFAULT_PERMISSIONS, ROLE_PERMISSION_MAP

DEMO_USERS = [
    {
        "email": "admin@nike.com",
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "warehouse_id": 1,
    },
    {
        "email": "supervisor@nike.com",
        "username": "supervisor",
        "password": "supervisor123",
        "role": "supervisor",
        "warehouse_id": 1,
    },
    {
        "email": "operador@nike.com",
        "username": "operador",
        "password": "operador123",
        "role": "operador",
        "warehouse_id": 3,
    },
]


async def seed_permissions(session: AsyncSession) -> list[Permission]:
    print("\n  [2/4] Sembrando permisos...")
    created: list[Permission] = []

    for perm_data in DEFAULT_PERMISSIONS:
        existing = await session.execute(
            select(Permission).where(
                Permission.module == perm_data["module"],
                Permission.action == perm_data["action"],
            )
        )
        perm = existing.scalar_one_or_none()
        if perm is None:
            perm = Permission(**perm_data)
            session.add(perm)
            created.append(perm)
            print(f"    + {perm_data['module']}.{perm_data['action']}")
        else:
            created.append(perm)

    await session.flush()
    print(f"    {len(created)} permisos asegurados")

    print("\n  [3/4] Asignando permisos por rol...")
    rp_count = 0
    for role, perm_keys in ROLE_PERMISSION_MAP.items():
        for key in perm_keys:
            module, action = key.split(".")
            perm_obj = next((p for p in created if p.module == module and p.action == action), None)
            if perm_obj is None:
                continue
            existing_rp = await session.execute(
                select(RolePermission).where(
                    RolePermission.role == role,
                    RolePermission.permission_id == perm_obj.permission_id,
                )
            )
            if existing_rp.scalar_one_or_none() is None:
                rp = RolePermission(role=role, permission_id=perm_obj.permission_id)
                session.add(rp)
                rp_count += 1

    print(f"    {rp_count} nuevas asignaciones rol-permiso")
    return created


async def seed_users(session: AsyncSession) -> list[User]:
    print("\n  [4/4] Sembrando usuarios demo...")
    created_users: list[User] = []

    for user_data in DEMO_USERS:
        existing = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = existing.scalar_one_or_none()

        if user:
            print(f"    ~ {user_data['email']} ya existe (ID {user.user_id}). Saltando...")
            created_users.append(user)
            continue

        user = User(
            email=user_data["email"],
            username=user_data["username"],
            password_hash=hash_password(user_data["password"]),
            role=user_data["role"],
            warehouse_id=user_data.get("warehouse_id"),
        )
        session.add(user)
        await session.flush()
        created_users.append(user)
        print(f"    + {user_data['email']} creado con rol '{user_data['role']}' (ID {user.user_id})")

    return created_users


async def log_audit(session: AsyncSession, user_id: int | None, action: str, entity_name: str, entity_id: str | None, details: dict) -> None:
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        details=details,
    )
    session.add(log)


async def run_migrations():
    print("\n  [0/4] Ejecutando migraciones de esquema...")
    from sqlalchemy import text

    MIGRATIONS = [
        # Route: waypoints
        "ALTER TABLE nike_logistica.routes ADD COLUMN IF NOT EXISTS waypoints JSONB",

        # Shipment: columnas de tracking
        "ALTER TABLE nike_logistica.shipments "
        "ADD COLUMN IF NOT EXISTS destination_warehouse_id INT, "
        "ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) DEFAULT 'truck', "
        "ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 2), "
        "ADD COLUMN IF NOT EXISTS product_name VARCHAR(150), "
        "ADD COLUMN IF NOT EXISTS quantity INT",

        # FK para destination_warehouse_id (condicional)
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipment_dest_wh') THEN "
        "ALTER TABLE nike_logistica.shipments "
        "ADD CONSTRAINT fk_shipment_dest_wh "
        "FOREIGN KEY (destination_warehouse_id) "
        "REFERENCES nike_logistica.warehouses(warehouse_id); "
        "END IF; "
        "END $$",

        # Waypoints ruta 1: Lima → Arequipa
        "UPDATE nike_logistica.routes SET waypoints = '"
        "[[-12.046373,-77.042754],[-12.5,-77.2],[-13.0,-77.0],[-13.5,-76.5],"
        "[-14.0,-76.0],[-14.5,-75.5],[-15.0,-75.0],[-15.5,-74.5],"
        "[-16.0,-73.5],[-16.2,-72.5],[-16.409047,-71.537451]]"
        "'::jsonb WHERE route_id = 1 AND waypoints IS NULL",

        # Waypoints ruta 2: Lima → Trujillo
        "UPDATE nike_logistica.routes SET waypoints = '"
        "[[-12.046373,-77.042754],[-11.8,-77.15],[-11.5,-77.3],[-11.2,-77.5],"
        "[-10.8,-78.0],[-10.5,-78.3],[-10.0,-78.6],[-9.5,-78.8],"
        "[-9.0,-79.0],[-8.5,-79.0],[-8.112782,-79.02837]]"
        "'::jsonb WHERE route_id = 2 AND waypoints IS NULL",

        # Waypoints ruta 3: Lima → Cusco
        "UPDATE nike_logistica.routes SET waypoints = '"
        "[[-12.046373,-77.042754],[-12.3,-76.8],[-12.6,-76.2],[-12.8,-75.8],"
        "[-13.0,-75.5],[-13.2,-75.0],[-13.3,-74.5],[-13.4,-73.5],"
        "[-13.5,-72.5],[-13.53195,-71.967463]]"
        "'::jsonb WHERE route_id = 3 AND waypoints IS NULL",

        # Waypoints ruta 4: Arequipa → Moquegua
        "UPDATE nike_logistica.routes SET waypoints = '"
        "[[-16.409047,-71.537451],[-16.6,-71.2],[-16.8,-71.0],"
        "[-17.0,-70.98],[-17.193037,-70.935163]]"
        "'::jsonb WHERE route_id = 4 AND waypoints IS NULL",

        # Waypoints ruta 5: Lima Interna
        "UPDATE nike_logistica.routes SET waypoints = '"
        "[[-12.046373,-77.042754],[-12.02,-77.05],[-12.0,-77.06],[-11.997399,-77.070756]]"
        "'::jsonb WHERE route_id = 5 AND waypoints IS NULL",

        # Ruta adicional: Arequipa → Lima (si no existe)
        "INSERT INTO nike_logistica.routes "
        "(organization_id, route_name, origin_city, destination_city, estimated_hours, distance_km, carrier, waypoints) "
        "SELECT 1, 'Arequipa → Lima', 'Arequipa', 'Lima', 16.0, 1010.0, 'Shalom', "
        "'[[-16.409047,-71.537451],[-16.2,-72.5],[-16.0,-73.5],[-15.5,-74.5],"
        "[-15.0,-75.0],[-14.5,-75.5],[-14.0,-76.0],[-13.5,-76.5],"
        "[-13.0,-77.0],[-12.5,-77.2],[-12.046373,-77.042754]]'::jsonb "
        "WHERE NOT EXISTS (SELECT 1 FROM nike_logistica.routes "
        "WHERE origin_city = 'Arequipa' AND destination_city = 'Lima')",
    ]

    async with central_engine.connect() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            try:
                async with conn.begin():
                    await conn.execute(text(sql))
                print(f"    {i}/{len(MIGRATIONS)} OK")
            except Exception as e:
                print(f"    {i}/{len(MIGRATIONS)} ERROR: {e}")
    print("    Migraciones aplicadas correctamente")


async def ensure_tables():
    print("\n  [1/4] Asegurando tablas en base de datos...")
    async with central_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("    Tablas verificadas/creadas correctamente")


async def seed_master():
    print("=" * 55)
    print("  SEED MASTER — Nike Logística")
    print("  Setup inicial del sistema")
    print("=" * 55)

    await run_migrations()
    await ensure_tables()

    async with CentralSessionLocal() as session:
        perms = await seed_permissions(session)
        users = await seed_users(session)
        await session.flush()

        for u in users:
            user_data = next((d for d in DEMO_USERS if d["email"] == u.email), None)
            await log_audit(
                session,
                user_id=u.user_id,
                action="SEED_USER_CREATED",
                entity_name="user",
                entity_id=str(u.user_id),
                details={
                    "email": u.email,
                    "username": u.username,
                    "role": u.role,
                    "warehouse_id": u.warehouse_id,
                },
            )

        for p in perms:
            await log_audit(
                session,
                user_id=None,
                action="SEED_PERMISSION_CREATED",
                entity_name="permission",
                entity_id=str(p.permission_id),
                details={
                    "module": p.module,
                    "action": p.action,
                    "label": p.label,
                },
            )

        await session.commit()

        print("\n" + "=" * 55)
        print("  SEED COMPLETADO")

        system_user = await session.execute(select(User).where(User.email == "admin@nike.com"))
        admin = system_user.scalar_one_or_none()
        if admin:
            from app.repositories.permission_repository import PermissionRepository
            perm_repo = PermissionRepository(session)
            perms_list = await perm_repo.get_effective_permissions(admin.user_id, admin.role)
            print(f"  Admin tiene {len(perms_list)} permisos efectivos")

        print("=" * 55)
        print()
        print("  Usuarios creados:")
        for u in users:
            ud = next(d for d in DEMO_USERS if d["email"] == u.email)
            print(f"    {ud['email']:35s} / {ud['password']:15s}  →  {u.role}")
        print()
        print("  Endpoint para verificar: GET /api/v1/auth/my-permissions")
        print("=" * 55)


if __name__ == "__main__":
    asyncio.run(seed_master())
