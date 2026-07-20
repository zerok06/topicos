from typing import Sequence
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission import Permission, RolePermission, UserPermission


DEFAULT_PERMISSIONS: list[dict] = [
    {"module": "dashboard", "action": "view", "label": "Ver Dashboard", "description": "Acceder al panel principal"},
    {"module": "inventory", "action": "view", "label": "Ver Inventario", "description": "Ver lista de inventario"},
    {"module": "inventory", "action": "create", "label": "Crear Producto", "description": "Crear nuevos productos"},
    {"module": "inventory", "action": "edit", "label": "Editar Producto", "description": "Editar productos existentes"},
    {"module": "inventory", "action": "delete", "label": "Eliminar Producto", "description": "Eliminar productos"},
    {"module": "inventory", "action": "transfer", "label": "Transferir Stock", "description": "Realizar traslados entre almacenes"},
    {"module": "inventory", "action": "export", "label": "Exportar Inventario", "description": "Exportar inventario a CSV/Excel"},
    {"module": "tracking", "action": "view", "label": "Ver Tracking", "description": "Ver mapa de tracking"},
    {"module": "products", "action": "view", "label": "Ver Productos", "description": "Ver catálogo de productos"},
    {"module": "products", "action": "create", "label": "Crear Producto", "description": "Crear productos en catálogo"},
    {"module": "products", "action": "edit", "label": "Editar Producto", "description": "Editar productos en catálogo"},
    {"module": "products", "action": "delete", "label": "Eliminar Producto", "description": "Eliminar productos del catálogo"},
    {"module": "audit", "action": "view", "label": "Ver Auditoría", "description": "Ver registro de auditoría"},
    {"module": "audit", "action": "export", "label": "Exportar Auditoría", "description": "Exportar logs de auditoría"},
    {"module": "chatbot", "action": "view", "label": "Ver Chatbot", "description": "Acceder al chatbot IA"},
    {"module": "chatbot", "action": "send", "label": "Enviar Mensaje", "description": "Enviar mensajes al chatbot"},
    {"module": "users", "action": "view", "label": "Ver Usuarios", "description": "Ver lista de usuarios"},
    {"module": "users", "action": "create", "label": "Crear Usuario", "description": "Crear nuevos usuarios"},
    {"module": "users", "action": "edit", "label": "Editar Usuario", "description": "Editar usuarios existentes"},
    {"module": "users", "action": "delete", "label": "Eliminar Usuario", "description": "Eliminar usuarios"},
    {"module": "users", "action": "toggle-active", "label": "Activar/Desactivar", "description": "Activar o desactivar usuarios"},
    {"module": "users", "action": "reset-password", "label": "Resetear Password", "description": "Resetear contraseña de usuarios"},
    {"module": "users", "action": "manage-permissions", "label": "Gestionar Permisos", "description": "Asignar permisos a usuarios"},
    {"module": "settings", "action": "view", "label": "Ver Ajustes", "description": "Acceder a configuración"},
    {"module": "settings", "action": "edit-profile", "label": "Editar Perfil", "description": "Editar perfil propio"},
    {"module": "settings", "action": "change-password", "label": "Cambiar Password", "description": "Cambiar propia contraseña"},
]


ROLE_PERMISSION_MAP: dict[str, list[str]] = {
    "admin": [
        "dashboard.view",
        "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.transfer", "inventory.export",
        "tracking.view",
        "products.view", "products.create", "products.edit", "products.delete",
        "audit.view", "audit.export",
        "chatbot.view", "chatbot.send",
        "users.view", "users.create", "users.edit", "users.delete", "users.toggle-active", "users.reset-password", "users.manage-permissions",
        "settings.view", "settings.edit-profile", "settings.change-password",
    ],
    "supervisor": [
        "dashboard.view",
        "inventory.view", "inventory.transfer", "inventory.export",
        "tracking.view",
        "products.view", "products.edit",
        "audit.view", "audit.export",
        "chatbot.view", "chatbot.send",
        "settings.view", "settings.edit-profile", "settings.change-password",
    ],
    "operador": [
        "dashboard.view",
        "inventory.view",
        "products.view",
        "chatbot.view", "chatbot.send",
        "settings.view", "settings.edit-profile", "settings.change-password",
    ],
}


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def seed_defaults(self) -> None:
        for perm_data in DEFAULT_PERMISSIONS:
            existing = await self.session.execute(
                select(Permission).where(
                    Permission.module == perm_data["module"],
                    Permission.action == perm_data["action"],
                )
            )
            if existing.scalar_one_or_none() is None:
                perm = Permission(**perm_data)
                self.session.add(perm)
        await self.session.flush()

        for role, perm_keys in ROLE_PERMISSION_MAP.items():
            for key in perm_keys:
                module, action = key.split(".")
                perm = await self.session.execute(
                    select(Permission).where(
                        Permission.module == module,
                        Permission.action == action,
                    )
                )
                perm_obj = perm.scalar_one_or_none()
                if perm_obj is None:
                    continue
                existing_rp = await self.session.execute(
                    select(RolePermission).where(
                        RolePermission.role == role,
                        RolePermission.permission_id == perm_obj.permission_id,
                    )
                )
                if existing_rp.scalar_one_or_none() is None:
                    rp = RolePermission(role=role, permission_id=perm_obj.permission_id)
                    self.session.add(rp)

    async def list_all(self) -> Sequence[Permission]:
        result = await self.session.execute(
            select(Permission).order_by(Permission.module, Permission.action)
        )
        return result.scalars().all()

    async def get_effective_permissions(self, user_id: int, role: str) -> list[str]:
        role_perms = await self.session.execute(
            select(Permission.module, Permission.action)
            .join(RolePermission, RolePermission.permission_id == Permission.permission_id)
            .where(RolePermission.role == role)
        )
        role_keys = set(f"{p.module}.{p.action}" for p in role_perms.all())

        user_perms = await self.session.execute(
            select(Permission.module, Permission.action, UserPermission.granted)
            .join(UserPermission, UserPermission.permission_id == Permission.permission_id)
            .where(UserPermission.user_id == user_id)
        )
        for module, action, granted in user_perms.all():
            key = f"{module}.{action}"
            if granted:
                role_keys.add(key)
            else:
                role_keys.discard(key)

        return sorted(role_keys)

    async def get_user_permissions(self, user_id: int) -> Sequence[UserPermission]:
        result = await self.session.execute(
            select(UserPermission).where(UserPermission.user_id == user_id)
        )
        return result.scalars().all()

    async def set_user_permission(self, user_id: int, permission_id: int, granted: bool) -> None:
        existing = await self.session.execute(
            select(UserPermission).where(
                UserPermission.user_id == user_id,
                UserPermission.permission_id == permission_id,
            )
        )
        up = existing.scalar_one_or_none()
        if up:
            up.granted = granted
        else:
            up = UserPermission(user_id=user_id, permission_id=permission_id, granted=granted)
            self.session.add(up)

    async def clear_user_permissions(self, user_id: int) -> None:
        await self.session.execute(
            delete(UserPermission).where(UserPermission.user_id == user_id)
        )
