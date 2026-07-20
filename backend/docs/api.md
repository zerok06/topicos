# Nike Logística Backend API

## Base URL

http://localhost:8000

## API Version

/api/v1

---

## GET /

Descripción:
Verifica que la API se encuentra disponible.

Respuesta:

{
  "message": "Nike Logística Backend funcionando"
}

---

## GET /api/v1/health

Descripción:
Verifica el estado del servicio.

Respuesta:

{
  "status": "ok",
  "service": "nike-logistica-backend"
}

---

### GET `/api/v1/system/database`

Comprueba la conectividad con las cuatro instancias PostgreSQL.

#### Cabecera requerida en modo demo

```http
X-Demo-Role: Admin
```
Respuesta exitosa:
 {
  "databases": {
    "central": "up",
    "sede": "up",
    "retail": "up",
    "supply": "up"
  }
}

## Próximos módulos
- Inventory
- Products
- Warehouses
- Transfers
- Audit Logs
- Chatbot IA