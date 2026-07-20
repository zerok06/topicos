# Roles y Permisos — Nike Logística

> Sistema integrado de gestión de inventario, tracking y auditoría con IA conversacional.

---

## Resumen

| Rol | Credenciales | Acceso |
|-----|-------------|--------|
| **Administrador** | `admin@nike.com` / `admin123` | Total — todos los módulos, CRUD completo, gestión de usuarios y permisos |
| **Supervisor** | `supervisor@nike.com` / `supervisor123` | Operativo — inventario (transferencias), tracking, edición de productos, auditoría |
| **Operador** | `operador@nike.com` / `operador123` | Consulta — dashboard, inventario (lectura), productos (lectura), chatbot, configuración básica |

---

## Administrador

> Control total del sistema.

### Dashboard
| Acción | Permiso |
|--------|---------|
| Ver panel principal | ✅ `dashboard.view` |

### Inventario
| Acción | Permiso |
|--------|---------|
| Ver lista de inventario | ✅ `inventory.view` |
| Crear productos | ✅ `inventory.create` |
| Editar productos | ✅ `inventory.edit` |
| Eliminar productos | ✅ `inventory.delete` |
| Transferir stock entre almacenes | ✅ `inventory.transfer` |
| Exportar inventario a CSV/Excel | ✅ `inventory.export` |

### Tracking
| Acción | Permiso |
|--------|---------|
| Ver mapa de tracking | ✅ `tracking.view` |

### Productos
| Acción | Permiso |
|--------|---------|
| Ver catálogo de productos | ✅ `products.view` |
| Crear productos | ✅ `products.create` |
| Editar productos | ✅ `products.edit` |
| Eliminar productos | ✅ `products.delete` |

### Auditoría
| Acción | Permiso |
|--------|---------|
| Ver registro de auditoría | ✅ `audit.view` |
| Exportar logs de auditoría | ✅ `audit.export` |

### Chatbot IA
| Acción | Permiso |
|--------|---------|
| Acceder al asistente IA | ✅ `chatbot.view` |
| Enviar mensajes al chatbot | ✅ `chatbot.send` |

### Usuarios
| Acción | Permiso |
|--------|---------|
| Ver lista de usuarios | ✅ `users.view` |
| Crear usuarios | ✅ `users.create` |
| Editar usuarios | ✅ `users.edit` |
| Eliminar usuarios | ✅ `users.delete` |
| Activar/Desactivar usuarios | ✅ `users.toggle-active` |
| Resetear contraseñas | ✅ `users.reset-password` |
| Gestionar permisos granulares | ✅ `users.manage-permissions` |

### Configuración
| Acción | Permiso |
|--------|---------|
| Acceder a configuración | ✅ `settings.view` |
| Editar perfil propio | ✅ `settings.edit-profile` |
| Cambiar propia contraseña | ✅ `settings.change-password` |

**Total: 26 permisos**

---

## Supervisor

> Gestión operativa del inventario y supervisión.

### Dashboard
| Acción | Permiso |
|--------|---------|
| Ver panel principal | ✅ `dashboard.view` |

### Inventario
| Acción | Permiso |
|--------|---------|
| Ver lista de inventario | ✅ `inventory.view` |
| Transferir stock entre almacenes | ✅ `inventory.transfer` |
| Exportar inventario a CSV/Excel | ✅ `inventory.export` |

### Tracking
| Acción | Permiso |
|--------|---------|
| Ver mapa de tracking | ✅ `tracking.view` |

### Productos
| Acción | Permiso |
|--------|---------|
| Ver catálogo de productos | ✅ `products.view` |
| Editar productos | ✅ `products.edit` |

### Auditoría
| Acción | Permiso |
|--------|---------|
| Ver registro de auditoría | ✅ `audit.view` |
| Exportar logs de auditoría | ✅ `audit.export` |

### Chatbot IA
| Acción | Permiso |
|--------|---------|
| Acceder al asistente IA | ✅ `chatbot.view` |
| Enviar mensajes al chatbot | ✅ `chatbot.send` |

### Configuración
| Acción | Permiso |
|--------|---------|
| Acceder a configuración | ✅ `settings.view` |
| Editar perfil propio | ✅ `settings.edit-profile` |
| Cambiar propia contraseña | ✅ `settings.change-password` |

**Total: 14 permisos**

---

## Operador

> Consulta del sistema y uso del asistente IA.

### Dashboard
| Acción | Permiso |
|--------|---------|
| Ver panel principal | ✅ `dashboard.view` |

### Inventario
| Acción | Permiso |
|--------|---------|
| Ver lista de inventario | ✅ `inventory.view` |

### Productos
| Acción | Permiso |
|--------|---------|
| Ver catálogo de productos | ✅ `products.view` |

### Chatbot IA
| Acción | Permiso |
|--------|---------|
| Acceder al asistente IA | ✅ `chatbot.view` |
| Enviar mensajes al chatbot | ✅ `chatbot.send` |

### Configuración
| Acción | Permiso |
|--------|---------|
| Acceder a configuración | ✅ `settings.view` |
| Editar perfil propio | ✅ `settings.edit-profile` |
| Cambiar propia contraseña | ✅ `settings.change-password` |

**Total: 8 permisos**

---

## Visibilidad en el menú lateral

| Módulo | Ruta | Admin | Supervisor | Operador |
|--------|------|-------|------------|----------|
| Dashboard | `/dashboard` | ✅ | ✅ | ✅ |
| Inventario | `/inventory` | ✅ | ✅ | ✅ |
| Tracking | `/tracking` | ✅ | ✅ | ❌ |
| Asistente IA | `/chatbot` | ✅ | ✅ | ✅ |
| Auditoría | `/audit` | ✅ | ✅ | ❌ |
| Usuarios | `/users` | ✅ | ❌ | ❌ |
| Configuración | `/settings` | ✅ | ✅ | ✅ |

---

## Notas técnicas

- Los permisos se almacenan en 3 tablas: `permissions` (definición), `role_permissions` (rol → permiso), `user_permissions` (usuario → permiso override directo).
- El sistema valida permisos tanto en **frontend** (oculta botones/menús) como en **backend** (middleware/fastapi dependencies).
- Los administradores pueden otorgar o revocar permisos específicos a usuarios individuales desde la pantalla **Usuarios > expandir fila > panel de permisos**.
- Para regenerar la configuración inicial: `POST /api/v1/auth/permissions/seed`.

---

## Seed inicial

Para crear los 3 usuarios y todos los permisos por primera vez:

```bash
cd backend
python -m app.core.seed_master
```
