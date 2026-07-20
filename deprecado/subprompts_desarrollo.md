# Guía de Sub-prompts para Desarrollo Modular
## División Detallada por Servicios y Componentes

Este documento desglosa cada uno de los 4 grandes bloques de desarrollo en **sub-prompts atómicos y accionables**. Cada sub-prompt está diseñado para ser copiado y entregado a una IA o desarrollador para construir el sistema de manera incremental, asegurando pruebas y estabilidad en cada paso.

---

## Servicio 1: Backend y Capa de Datos (Cimientos y Conectividad)

### Sub-prompt 1.1: Base de Datos de Sistema y Modelos Multi-tenant
```text
OBJETIVO:
Configurar la base de datos relacional de sistema (PostgreSQL) para gestionar la configuración de la plataforma, usuarios y espacios de trabajo.

TAREAS:
1. Configurar un proyecto base en [NestJS / FastAPI] con un ORM [Prisma / SQLAlchemy].
2. Crear un script de migración para las siguientes tablas:
   - `organizations` (id, name, created_at)
   - `users` (id, email, password_hash, role_id, organization_id, created_at)
   - `roles` (id, name [admin, supervisor, operator, logistics, sales, finance, guest], organization_id, created_at)
   - `role_db_permissions` (id, role_id, database_name, allowed_tables [JSON/Array de tablas], restriction_rules [JSON/ABAC], created_at)
   - `role_tool_permissions` (id, role_id, allowed_tools [JSON/Array], allowed_agents [JSON/Array], created_at)
   - `workspaces` (id, title, organization_id, created_at, updated_at)
   - `conversations` (id, title, workspace_id, user_id, created_at)
   - `artifacts` (id, title, type [table, chart, document, dashboard], data [JSON], workspace_id, created_at, updated_at)
3. Implementar endpoints CRUD básicos para autenticar usuarios, crear workspaces y listar conversaciones.
4. Asegurar que cada consulta filtre estrictamente por el `organization_id` del usuario autenticado (multi-tenancy).
5. Implementar funciones/utilidades helper para validar permisos en caliente (ej: `verify_user_access(user_id, db_name, table_name, tool_name)`) que comprueben si el rol del usuario puede ejecutar consultas o herramientas específicas antes de ejecutarlas.
```

### Sub-prompt 1.2: Adaptadores de Bases de Datos y Carga de Archivos
```text
OBJETIVO:
Crear adaptadores de datos de solo lectura para bases de datos operacionales y procesamiento de archivos externos.

TAREAS:
1. Crear un módulo `data_adapters` en el backend.
2. Implementar un conector genérico que reciba credenciales y soporte:
   - Conexión y ejecución de consultas SQL (solo comandos SELECT para seguridad).
   - Función para extraer metadatos del esquema (listado de tablas, nombres de columnas, tipos de datos y claves foráneas).
3. Soportar dialectos para PostgreSQL, MySQL y SQLite.
4. Crear un adaptador para archivos cargados por el usuario (.csv, .xlsx). El sistema debe leer el archivo, inferir tipos de datos y cargarlo en una base de datos SQLite en memoria de manera temporal para permitir consultas SQL sobre el archivo.
```

### Sub-prompt 1.3: Capa Semántica (Semantic Layer) y Traducción de Consultas
```text
OBJETIVO:
Implementar la capa semántica que traduce conceptos operacionales de negocio a términos de bases de datos físicas.

TAREAS:
1. Diseñar un esquema JSON (`semantic_map.json`) que mapee conceptos de negocio a tablas/columnas físicas (ej. "existencias" -> "inventory.stock_qty", "tienda" -> "stores.store_name").
2. Crear una clase `SemanticTranslator` que exponga un método para:
   - Tomar una consulta o esquema físico y enriquecerlo con las definiciones del mapa semántico para presentárselo a los agentes de IA.
   - Analizar las consultas SQL generadas por los agentes para verificar que solo accedan a tablas mapeadas en el mapa semántico de su tenant.
3. Asegurar que el traductor inyecte dinámicamente cláusulas de filtrado (ej. `AND tenant_id = :tenant_id`) en cualquier consulta generada.
```

### Sub-prompt 1.4: LLM Provider Layer con Fallback
```text
OBJETIVO:
Crear la capa de abstracción del proveedor de Inteligencia Artificial para desacoplar el sistema de proveedores específicos de LLM.

TAREAS:
1. Diseñar una interfaz común `LLMClient` con métodos para:
   - `generate_text(prompt, system_instruction)`
   - `generate_structured_output(prompt, response_schema, system_instruction)`
   - `chat_completion(messages, tools)`
2. Implementar la clase `GeminiProvider` utilizando el SDK oficial de Google Gen AI (soporte para Gemini 2.5/2.0 y Tool Calling).
3. Implementar un segundo proveedor de fallback (ej. `OpenAIProvider` o `MockLLMProvider`).
4. Añadir lógica de conmutación por error (fallback): si el proveedor primario falla o supera un tiempo límite de respuesta, cambiar automáticamente al proveedor secundario y registrar una advertencia en los logs del sistema.
```

---

## Servicio 2: El Cerebro (Orquestador y Motor de Agentes)

### Sub-prompt 2.1: Bucle de Orquestación y Gestores de Contexto y Memoria
```text
OBJETIVO:
Implementar el bucle principal de orquestación y los gestores de memoria a corto y largo plazo.

TAREAS:
1. Crear el orquestador principal (`Orchestrator`) que controle el bucle de razonamiento y acción (ReAct).
2. Desarrollar el `ContextManager` para:
   - Recuperar el historial de los últimos N mensajes de la conversación.
   - Extraer la información del usuario actual (rol, permisos) y los artefactos activos en el Workspace.
   - Formatear e inyectar esta información en el prompt del orquestador.
3. Implementar el `MemoryManager`:
   - Cuando la conversación supere el límite de tokens, llamar al LLM para resumir la conversación anterior.
   - Almacenar el resumen en la base de datos de sistema y usarlo como prefijo de contexto en futuros turnos.
```

### Sub-prompt 2.2: Planificador de Objetivos Complejos (Planner)
```text
OBJETIVO:
Crear el componente encargado de descomponer peticiones complejas en pasos lógicos estructurados.

TAREAS:
1. Crear un módulo `Planner` que reciba la consulta del usuario y el esquema semántico de datos disponible.
2. Hacer que el Planner consulte a Gemini para generar un JSON estructurado con el siguiente esquema:
   - `steps`: Un array de objetos con `{ step_id, agent_type, objective, dependencies: [] }`.
3. Validar el grafo de tareas generado para asegurar que no contenga ciclos infinitos y que todas las dependencias lógicas se puedan resolver de forma secuencial o paralela.
```

### Sub-prompt 2.3: Enrutador de Agentes y Sistema de Prompts
```text
OBJETIVO:
Implementar el enrutamiento a agentes especializados y sus configuraciones de prompt del sistema.

TAREAS:
1. Crear un registro de agentes en el backend (`AgentRegistry`).
2. Definir las instrucciones del sistema (System Prompts) y el alcance de permisos para:
   - **Agente Inventario:** Permiso exclusivo sobre herramientas de stock.
   - **Agente Logística:** Permiso sobre herramientas de transporte y entregas.
   - **Agente BI:** Especializado en análisis matemático e histórico.
   - **Agente Administrador:** Acceso a metadatos de configuración.
3. Implementar el `AgentRouter` que tome un paso del planificador y, evaluando las descripciones de los agentes, decida a cuál de ellos delegarle la tarea.
```

### Sub-prompt 2.4: Registro y Ejecución de Herramientas (Tool Layer)
```text
OBJETIVO:
Crear la capa de herramientas ejecutables por los agentes con validación estricta de parámetros.

TAREAS:
1. Implementar la clase abstracta `BaseTool` que infiera el esquema JSON schema de sus parámetros de entrada.
2. Programar y registrar las siguientes herramientas básicas:
   - `RunSQLQuery`: Ejecuta consultas SQL validadas a través del adaptador y el traductor semántico.
   - `GetSemanticSchema`: Devuelve el diccionario de datos de negocio al agente.
   - `RegisterArtifact`: Recibe un JSON estructurado de datos de parte del agente y crea un nuevo artefacto en el backend.
3. Asegurar que las herramientas verifiquen que el agente que las invoca tiene permisos activos para esa acción específica.
```

---

## Servicio 3: Frontend y Espacio de Trabajo (UI/UX)

### Sub-prompt 3.1: Interfaz Base Premium, Chat y Pantalla Dividida (Split Screen)
```text
OBJETIVO:
Construir la interfaz de usuario base con una estética premium, soporte para temas y diseño dividido.

TAREAS:
1. Configurar un proyecto Next.js en TypeScript con TailwindCSS.
2. Definir un sistema de diseño con paleta oscura y moderna (colores Slate/Zinc de base, acentos Indigo/Violeta, y bordes sutiles).
3. Diseñar el layout principal:
   - **Sidebar izquierdo colapsable:** Listado de workspaces y conversaciones históricas.
   - **Área principal dividida (Split Screen):**
     - **Columna Chat (40%):** Caja de diálogo, historial de mensajes con burbujas estilizadas, scroll automático.
     - **Columna Canvas (60%):** Tablero dinámico donde se colocan los artefactos activos.
4. Implementar transiciones fluidas de CSS cuando se colapse el sidebar o se ajuste el tamaño del canvas.
```

### Sub-prompt 3.2: Trazabilidad del Agente en Tiempo Real (Step Tracer)
```text
OBJETIVO:
Crear un componente visual interactivo para mostrar el proceso de razonamiento y ejecución de herramientas de los agentes.

TAREAS:
1. Diseñar el componente `AgentExecutionTrace` que se renderiza debajo del mensaje en curso del chat.
2. El componente debe recibir y mostrar estados en tiempo real estructurados en un acordeón:
   - Agente Activo (ej. "Agente de Compras")
   - Acción actual (ej. "Planificando pasos...", "Llamando a herramienta SQL...")
   - Herramienta ejecutada con parámetros y latencia parcial.
3. Implementar micro-animaciones (loaders tipo pulso, transiciones de check en pasos finalizados) para mantener al usuario informado durante esperas prolongadas.
```

### Sub-prompt 3.3: Componentes de Artefactos Interactivos
```text
OBJETIVO:
Crear los componentes de UI encargados de renderizar las diferentes visualizaciones de datos generadas por los agentes.

TAREAS:
1. Crear un sistema de renderizado de artefactos dinámico basado en un objeto JSON (`{ id, type, title, data }`).
2. Desarrollar los siguientes sub-componentes:
   - **ArtifactTable:** Tabla interactiva con capacidad para ordenar columnas, filtrar texto y botón para exportar a CSV.
   - **ArtifactChart:** Integrar Recharts para dibujar gráficos de barras, líneas y sectores circulares según la configuración enviada por el agente.
   - **ArtifactDocument:** Renderizador de Markdown con soporte para bloques de código y tablas estilizadas.
   - **ArtifactKPI:** Mosaico de tarjetas con números clave, etiquetas de progreso y minigráficos de tendencia (sparklines).
```

### Sub-prompt 3.4: Conectividad WebSockets y SSE para el Workspace
```text
OBJETIVO:
Implementar la comunicación bidireccional en tiempo real para recibir mensajes de chat e instrucciones de actualización de artefactos.

TAREAS:
1. Integrar Socket.io-client o WebSockets nativos en el Frontend.
2. Escuchar los siguientes eventos desde el servidor:
   - `agent_stream_token`: Para renderizar la respuesta del chat palabra por palabra.
   - `agent_trace_step`: Actualización del estado del trazador del agente.
   - `artifact_created` o `artifact_updated`: Para instanciar o actualizar en tiempo real el componente correspondiente en el panel del Canvas de manera asíncrona.
3. Gestionar la reconexión automática en caso de pérdida de red y sincronización del estado actual.
```

---

## Servicio 4: Automatización y Operaciones (Workflows y Observabilidad)

### Sub-prompt 4.1: Motor de Tareas y Workflows en Segundo Plano
```text
OBJETIVO:
Crear el motor de workflows asíncronos para ejecutar automatizaciones que involucren a múltiples agentes y sistemas.

TAREAS:
1. Configurar un sistema de colas en segundo plano ([BullMQ en NestJS / Celery en FastAPI]) utilizando Redis como broker.
2. Definir una estructura de datos para un `Workflow`: `{ id, name, trigger [cron, event], steps: [{ step_id, agent_type, tool, action_data }] }`.
3. Implementar la ejecución asíncrona: el worker levanta la tarea, recupera el contexto, invoca a los agentes correspondientes de forma secuencial y guarda el estado (pendiente, en ejecución, completado, fallido) en la base de datos de sistema.
4. Proveer lógica de manejo de errores y reintentos automáticos para pasos que dependan de APIs externas con fallos temporales.
```

### Sub-prompt 4.2: Trazabilidad, Auditoría y Analítica de Costes IA
```text
OBJETIVO:
Registrar de forma inmutable todas las interacciones del sistema, uso de datos y calcular los costes asociados del uso de LLMs.

TAREAS:
1. Crear un middleware/interceptor global que capture:
   - ID del usuario, ID de la organización y consulta original.
   - Llamadas exactas hechas al LLM (prompt de entrada y salida en tokens).
   - Consultas SQL ejecutadas en las bases de datos clientes.
2. Implementar la clase `CostCalculator` que multiplique la cantidad de tokens de entrada y salida por el costo unitario del modelo de Gemini configurado.
3. Guardar estos registros en una tabla de auditoría dedicada (`audit_logs`) para cumplir con normativas de seguridad y control presupuestario de la empresa.
```

### Sub-prompt 4.3: Centro de Notificaciones Multicanal
```text
OBJETIVO:
Implementar un sistema de notificaciones para alertar al usuario sobre eventos del sistema y workflows finalizados.

TAREAS:
1. Crear un servicio de notificaciones en el backend con soporte multicanal:
   - **En la aplicación:** Emisión de eventos WebSockets para mostrar popups/toasts interactivos en el frontend.
   - **Correo Electrónico:** Integración SMTP o servicio de mensajería para enviar correos formateados con plantillas HTML (ej. adjuntar reporte PDF generado por un agente).
   - **Slack / Teams:** Webhooks salientes configurables por tenant para alertar en canales específicos de la organización.
```

### Sub-prompt 4.4: Consolidación de Seguridad y Despliegue Local
```text
OBJETIVO:
Implementar medidas críticas de seguridad en la capa de datos y empaquetar toda la aplicación para su ejecución local.

TAREAS:
1. Configurar la autenticación JWT para asegurar todos los endpoints de la API y los canales de WebSockets.
2. Asegurar que las credenciales de conexión del data layer de bases de datos de clientes solo tengan permisos de SELECT (lectura) a nivel de la base de datos, previniendo cualquier riesgo de modificación accidental.
3. Crear un archivo `docker-compose.yml` que configure:
   - Contenedor para el Frontend (Next.js).
   - Contenedor para el Backend API.
   - Base de datos PostgreSQL de sistema.
   - Instancia de Redis (para colas y caché).
   - Worker para tareas en segundo plano.
4. Incluir un script para inicializar la base de datos con un tenant y usuario administrador de prueba de forma automática al levantar los contenedores.
```
