# Prompts de Desarrollo: Servicio 1 - Backend y Capa de Datos (Cimientos)

Este archivo contiene los sub-prompts secuenciales para implementar la base de datos de sistema, los adaptadores operacionales, la capa semántica y la abstracción del cliente LLM.

---

## Sub-prompt 1.1: Base de Datos de Sistema y Modelos Multi-tenant

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Configura la base de datos relacional de sistema utilizando FastAPI (Python) con SQLAlchemy (o el framework backend de tu preferencia) para gestionar la configuración de la plataforma, usuarios, espacios de trabajo y permisos de acceso a datos.

Realiza las siguientes tareas:
1. Configura un proyecto base de API con la estructura de carpetas modular recomendada.
2. Crea scripts de inicialización o migraciones para las siguientes tablas:
   - `organizations` (id, name, created_at)
   - `users` (id, email, password_hash, role_id, organization_id, created_at)
   - `roles` (id, name [admin, supervisor, operator, logistics, sales, finance, guest], organization_id, created_at)
   - `role_db_permissions` (id, role_id, database_name, allowed_tables [JSON/Array de tablas a las que tiene acceso], restriction_rules [JSON/Array de reglas ABAC], created_at)
   - `role_tool_permissions` (id, role_id, allowed_tools [JSON/Array de herramientas permitidas, ej. ["RunSQLQuery", "SendEmail"]], allowed_agents [JSON/Array de agentes permitidos], created_at)
   - `workspaces` (id, title, organization_id, created_at, updated_at)
   - `conversations` (id, title, workspace_id, user_id, created_at)
   - `artifacts` (id, title, type [table, chart, document, dashboard], data [JSON], workspace_id, created_at, updated_at)
3. Implementa endpoints CRUD básicos y seguros para autenticación (Registro/Login con JWT y bcrypt hashing), creación de workspaces y visualización de conversaciones.
4. Asegura que todas las consultas y endpoints filtren y aíslen la información estrictamente utilizando el 'organization_id' del usuario autenticado (principio multi-tenant).
5. Diseña una función de utilidad de seguridad `verify_user_access(user_id, database_name, table_name, tool_name)` que valide si el rol del usuario tiene permitido realizar consultas sobre una base de datos/tabla específica o invocar una herramienta específica.
6. Crea un set de pruebas unitarias o de integración simples para validar la autenticación, el aislamiento de datos entre tenants y la restricción de acceso a bases de datos/herramientas según el rol del usuario.```

---

## Sub-prompt 1.2: Adaptadores de Bases de Datos y Carga de Archivos

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Crea adaptadores de datos independientes y de solo lectura para conectar bases de datos operacionales externas y procesar archivos planos cargados por el usuario.

Realiza las siguientes tareas:
1. Crea un módulo 'data_adapters' en el backend.
2. Implementa un conector SQL genérico que reciba credenciales de conexión y soporte:
   - Ejecución segura de consultas SQL (restringido estrictamente a comandos SELECT para evitar modificaciones).
   - Extracción automática de metadatos del esquema (listado de tablas, nombres de columnas, tipos de datos y claves foráneas).
3. Asegura soporte para dialectos de PostgreSQL, MySQL y SQLite.
4. Diseña un adaptador para archivos (.csv, .xlsx). Al cargar un archivo, el sistema debe parsear el contenido, inferir tipos de datos y crear una tabla temporal en una base de datos SQLite en memoria, permitiendo que el sistema pueda realizar consultas SQL estándar sobre el archivo cargado.
5. Agrega pruebas unitarias que simulen la conexión a una base de datos local y la carga/consulta de un archivo CSV de ejemplo.
```

---

## Sub-prompt 1.3: Capa Semántica (Semantic Layer) y Traducción de Consultas

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa la capa semántica de la plataforma, la cual traduce consultas conceptuales de negocio en términos físicos de la base de datos empresarial.

Realiza las siguientes tareas:
1. Diseña la estructura de un archivo JSON 'semantic_map.json' para definir mapeos semánticos. Ejemplo: "existencias" -> "inventory.stock_qty", "tienda" -> "stores.store_name", "ventas del mes" -> tabla "orders" filtrada por fecha actual.
2. Crea una clase 'SemanticTranslator' en el backend que exponga métodos para:
   - Traducir términos y alias lógicos a nombres reales de tablas y columnas antes de enviar esquemas a los agentes LLM.
   - Analizar sintácticamente (o verificar) las consultas generadas por el LLM para garantizar que cumplan con las restricciones semánticas permitidas.
3. Asegura que el traductor inyecte automáticamente cláusulas obligatorias de filtrado de inquilino (ej. "AND tenant_id = X") en toda sentencia SQL generada para evitar fugas de información.
4. Escribe pruebas de traducción para verificar que el mapeo y la inyección de seguridad multi-tenant funcionen correctamente.
```

---

## Sub-prompt 1.4: LLM Provider Layer con Fallback

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Desarrolla la capa de abstracción del proveedor de Inteligencia Artificial para desacoplar el core del sistema de las APIs específicas de modelos de lenguaje (LLM).

Realiza las siguientes tareas:
1. Define una interfaz común 'LLMClient' con los siguientes métodos obligatorios:
   - `generate_text(prompt, system_instruction)`
   - `generate_structured_output(prompt, response_schema, system_instruction)` (para garantizar respuestas en formato JSON estricto)
   - `chat_completion(messages, tools)` (para interactuar en formato chat y soportar llamadas a herramientas/funciones)
2. Implementa la clase 'GeminiProvider' que consuma el SDK oficial de Google Gen AI utilizando las mejores prácticas para Gemini 2.5/2.0 y Tool Calling.
3. Implementa un proveedor secundario de respaldo ('OpenAIProvider' o 'MockLLMProvider').
4. Añade un mecanismo automático de Fallback: si el proveedor principal arroja un error de cuota, latencia o caída, el sistema debe redirigir la llamada al proveedor secundario registrando la advertencia en el sistema de observabilidad.
5. Crea pruebas unitarias simulando fallos en el servicio primario para verificar la resiliencia y conmutación automática.
```
