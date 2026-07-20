# Documento de Arquitectura y Diseño Técnico
## Plataforma de Inteligencia Operacional Basada en Agentes

---

## 1. Visión del Producto y Filosofía de Diseño

Esta plataforma representa un cambio de paradigma en la interacción humano-datos para entornos empresariales. El usuario final **no consulta bases de datos directamente, ni navega por complejos sistemas ERP/CRM**. En su lugar, interactúa con un **ecosistema de agentes inteligentes especializados** a través de lenguaje natural. 

El sistema unifica, interpreta y explota múltiples fuentes de datos distribuidas en la organización, traduciendo consultas operacionales en respuestas dinámicas, flujos de trabajo automatizados (workflows) y **artefactos visuales e interactivos** en tiempo real.

```mermaid
graph TD
    User([Usuario]) <--> |Lenguaje Natural| FE[Frontend Conversacional]
    FE <--> |API REST / WebSockets| BE[Backend API Gateway]
    BE <--> |Eventos / Contexto| ORC[Orchestrator]
    
    subgraph Cerebro del Sistema [Orchestrator & LLM Layer]
        ORC <--> Router[Agent & Tool Router]
        ORC <--> Context[Context & Memory Manager]
        ORC <--> Workflow[Workflow Engine & Planner]
        ORC <--> LLM[LLM Provider Layer]
    end
    
    Router <--> AG[Sistema de Agentes Especializados]
    Router <--> TL[Tool Layer]
    
    subgraph Data & Integration [Data & Connection Layers]
        TL <--> DataLayer[Data & Semantic Layer]
        DataLayer <--> Adapters[Adaptadores de Datos]
    end
    
    Adapters <--> DBs[(MySQL/PostgreSQL/Oracle/etc.)]
    Adapters <--> ERPs[ERP / CRM / APIs / Archivos]
    
    style Cerebro del Sistema fill:#f5f7ff,stroke:#4f46e5,stroke-width:2px
    style Data & Integration fill:#fdf8f5,stroke:#ea580c,stroke-width:2px
```

---

## 2. Arquitectura de Alto Nivel y Flujo de Información

La arquitectura está dividida en capas desacopladas, lo que permite la escalabilidad independiente de los agentes, las herramientas, los adaptadores de datos y la interfaz de usuario.

### Flujo de Ejecución de una Consulta (Paso a Paso)
1. **Entrada del Usuario:** El usuario solicita en el chat del Frontend: *"Analiza el stock de zapatillas Nike del último trimestre y envíame un reporte de faltantes por correo"*.
2. **Gateway y Contexto:** La petición llega al Backend (API Gateway), se autentica, se valida el tenant (empresa) y se recupera el contexto activo (Workspace y conversación).
3. **Planificación y Orquestación:** El *Orchestrator* recibe la petición y el contexto. El *Planner* la descompone en subtareas:
   - Consultar inventario histórico y actual.
   - Detectar productos con stock crítico.
   - Generar un artefacto de tabla/gráfico con la información.
   - Generar un reporte en formato PDF/Markdown.
   - Enviar correo al usuario con el reporte adjunto.
4. **Enrutamiento de Agentes (Agent Router):** El orquestador convoca al *Agente de Inventario* para consultar datos, al *Agente BI/Reportes* para analizar y generar el documento, y al *Agente de Comunicaciones* para el envío.
5. **Capa de Herramientas y Datos (Tool & Data Layer):** 
   - El *Agente de Inventario* llama a la herramienta `SQL Query Tool`. 
   - La herramienta pasa la consulta por el *Semantic Layer* para traducir términos lógicos a físicos del ERP/Base de datos.
   - El *Adaptador* correspondiente (ej. PostgreSQL) ejecuta la consulta y devuelve los datos limpios.
6. **Generación del Artefacto:** El orquestador procesa los datos y llama al *Artifact Generator* para crear un componente interactivo de tipo "Tabla de Stock Crítico" y un "Dashboard de Rotación".
7. **Respuesta en Tiempo Real:** El Frontend recibe los artefactos de manera asíncrona mediante WebSockets y los renderiza en un espacio de trabajo dinámico (Canvas) al lado del chat.

---

## 3. Arquitectura y Especificación Detallada por Servicio

### 3.1. Frontend (Capa de Presentación)
* **Responsabilidad:** Exclusivamente la interfaz de usuario. No almacena credenciales de bases de datos ni ejecuta lógica de negocio pesada.
* **Tecnologías Recomendadas:** React con Next.js (App Router), TailwindCSS, Shadcn/UI para componentes, Lucide Icons para iconografía, y Recharts/D3.js para la renderización de gráficos.
* **Componentes Clave:**
  - **Chat Inteligente:** Panel interactivo con soporte para hilos multisesión, indicador de escritura de agentes en tiempo real y sugerencias dinámicas basadas en el contexto.
  - **Workspace (Gemini Canvas-like):** Vista dividida en pantalla (*split screen*). El lado izquierdo contiene la conversación y el derecho es un espacio infinito o de cuadrícula donde se anclan los artefactos generados (dashboards, reportes, mapas).
  - **Panel de Agentes (Auditoría Visual):** Componente tipo acordeón o línea de tiempo que muestra qué agente procesó la respuesta, qué bases de datos consultó, la latencia y los tokens consumidos.
  - **Centro de Notificaciones:** Sistema basado en WebSockets para alertas en tiempo real sobre tareas en segundo plano finalizadas (ej. *"El reporte logístico mensual ya está listo"*).

### 3.2. Backend (Capa de Servicios de Aplicación)
* **Responsabilidad:** Gestión de usuarios, seguridad, control de acceso multi-inquilino (multi-tenant) y persistencia de metadatos (chats, workspaces, configuraciones).
* **Tecnologías Recomendadas:** Node.js (NestJS o Fastify) o Python (FastAPI), PostgreSQL (para almacenamiento relacional del sistema: usuarios, logs, metadatos), y Redis (para caché y sesiones en tiempo real).
* **Componentes Clave:**
  - **API Gateway:** Punto único de entrada para el frontend. Gestiona rate limiting, compresión de datos y enrutamiento de WebSockets.
  - **Gestor de Organizaciones (Multi-Tenancy):** Aislamiento estricto de datos a nivel de base de datos o mediante claves de inquilino indexadas (`tenant_id`) en todas las consultas.
  - **Gestor de Permisos y Control de Acceso Granular (RBAC & ABAC):** 
    Implementa una matriz de permisos que vincula los roles de usuario con los accesos permitidos:
    * **Sistema de Roles:** `Administrador`, `Supervisor`, `Operador`, y roles de área especializada (`Logística`, `Ventas`, `Finanzas`, `Invitado`).
    * **Control de Acceso a Bases de Datos (Database Entitlements):** Define a qué bases de datos físicas (ej. PostgreSQL de Ventas, Oracle de ERP) y a qué tablas/vistas específicas tiene permitido acceder el usuario según su rol de área. Por ejemplo, el rol `Logística` no puede consultar tablas de nóminas o márgenes financieros.
    * **Control de Acceso a Agentes y Herramientas (Agent & Tool Entitlements):** Determina qué agentes especializados (ej. Agente Finanzas) y qué herramientas críticas (ej. `SendEmailNotificationTool` o `RunQueryTool`) puede invocar el orquestador en nombre del usuario.
    * **Políticas de Ejecución en Caliente (Runtime Policy):** El orquestador valida la matriz de permisos de forma activa antes de generar el plan y de ejecutar cualquier herramienta de datos.
  - **Módulo de Auditoría:** Registro inmutable en base de datos de cada acción (usuario, pregunta, agentes involucrados, herramientas utilizadas, base de datos consultada y datos expuestos) para auditoría de seguridad.

### 3.3. Orchestrator (El Cerebro)
* **Responsabilidad:** Orquestar la conversación, coordinar el flujo de agentes, mantener la memoria a corto/largo plazo y secuenciar tareas complejas.
* **Tecnologías Recomendadas:** Python (utilizando arquitecturas basadas en grafos de estado como LangGraph o arquitecturas personalizadas basadas en colas de mensajes).
* **Componentes Clave:**
  - **Agent Router:** Clasificador semántico rápido que decide qué agente(s) tienen la especialización requerida para atender la consulta actual.
  - **Planner & Execution Loop:** Motor que genera un plan de pasos secuenciales o paralelos para resolver una tarea, evaluando dinámicamente si se necesitan correcciones sobre la marcha.
  - **Context & Memory Manager:** Almacén persistente (híbrido relacional y base de datos vectorial para búsqueda semántica) que contiene el contexto global: usuario, historial del chat, estado actual del canvas y datos de la organización.
  - **Event Engine:** Broker de eventos (ej. RabbitMQ, Redis Pub/Sub) que gestiona eventos asíncronos del sistema (ej. alertar a un agente si el stock baja de cierto umbral).

### 3.4. Sistema de Agentes
Cada agente es un microservicio lógico o una clase con un prompt de sistema especializado, directrices de comportamiento y acceso exclusivo a un subconjunto de herramientas.
* **Agente Inventario:** Especialista en stock, almacenes, movimientos y rotación de mercancía.
* **Agente Productos:** Administrador del catálogo, atributos de SKU, clasificaciones y jerarquías de productos.
* **Agente Logística:** Especializado en transporte, rutas de despacho, entregas y tiempos de tránsito.
* **Agente Compras:** Experto en órdenes de compra, evaluación de proveedores y costes de adquisición.
* **Agente Ventas:** Encargado de analizar pedidos, facturación e histórico de clientes.
* **Agente Finanzas:** Analista de márgenes, flujo de caja operativo y gastos.
* **Agente BI:** Generador de predicciones (forecasts), KPIs clave y detección de anomalías operativas.
* **Agente Reportes:** Constructor y formateador de PDFs, Excels y presentaciones corporativas.
* **Agente Administrador:** Monitorea la salud del sistema, actualiza configuraciones de otros agentes y diagnostica errores.

### 3.5. Tool Layer (Capa de Herramientas)
Los agentes no realizan acciones por sí mismos; ejecutan herramientas registradas en esta capa mediante esquemas JSON definidos.
* **Data Tools:** Ejecución segura de consultas SQL autogeneradas en modo solo lectura, introspección de esquemas y recuperación de relaciones.
* **Analytics Tools:** Modelos matemáticos y estadísticos rápidos (ej. regresiones para forecasts, cálculos de desviación estándar).
* **Visualization Tools:** Generadores de configuraciones JSON para gráficos (ej. estructurar datos para renderizar un gráfico de barras en el frontend).
* **Reporting Tools:** Motores de renderizado HTML-to-PDF, generadores de hojas de cálculo (.xlsx) y diapositivas (.pptx).
* **Diagram Tools:** Motores para compilar texto (como sintaxis Mermaid o BPMN) en diagramas renderizables.
* **Communication Tools:** Conectores con APIs externas de comunicación (SMTP, Slack webhooks, Microsoft Teams, WhatsApp Business API).

### 3.6. Sistema de Artefactos (Resultados Persistentes)
Un artefacto es la representación estructurada y visual de una respuesta compleja del agente. No es simple texto; es un objeto persistente con su propio ciclo de vida.
* **Tipos de Artefactos:**
  - **Tabla:** Datos tabulares con capacidades de filtrado, ordenamiento y exportación rápida.
  - **Dashboard:** Colección de KPIs y gráficos interconectados que se actualizan en tiempo real.
  - **Gráfico:** Barras, líneas, pastel, Sankey (flujo logístico), Heatmap (concentración de inventario).
  - **Documento:** Texto enriquecido (Markdown) editable cooperativamente y estructurado.
  - **Canvas:** El contenedor superior donde el usuario arrastra y organiza múltiples artefactos a su gusto.
  - **Diagrama:** Flujos lógicos representados visualmente (BPMN, UML, diagramas de procesos).
* **Persistencia:** Cada artefacto se guarda como un documento JSON en base de datos vinculado a un `workspace_id`. Si el chat avanza, el artefacto se mantiene estático o se actualiza si el agente realiza una modificación explícita.

### 3.7. Data Layer (Abstracción de Datos)
* **Responsabilidad:** Proporcionar una interfaz limpia y unificada para que los agentes consulten datos empresariales sin conocer los nombres crudos de las tablas físicas.
* **Componentes Clave:**
  - **Catálogo de Datos & Metadata Manager:** Rastreador automático que lee el diccionario de datos de las bases conectadas y expone su estructura al orquestador en un lenguaje descriptivo.
  - **Semantic Layer:** Traduce conceptos de negocio. Si un usuario dice *"zapatillas más vendidas"*, la capa semántica mapea esto a la tabla `orders_detail` sumando la columna `quantity` donde el código de categoría sea `shoes`. Esto previene alucinaciones del modelo al generar SQL.
  - **Data Federation:** Motor de consulta distribuido que permite combinar en una única consulta lógica datos procedentes de un PostgreSQL de ventas y un SQL Server de logística.

### 3.8. Adaptadores
* **Responsabilidad:** Traducir los comandos unificados de la capa de datos a protocolos específicos de base de datos o de sistemas empresariales.
* **Adaptadores Soportados:**
  - **Relacionales:** PostgreSQL, MySQL, MariaDB, SQL Server, Oracle.
  - **No Relacionales:** MongoDB (para metadatos de documentos u otros flujos semiestructurados).
  - **Sistemas de Terceros:** Conectores ERP (SAP, Odoo, Microsoft Dynamics), CRM (Salesforce) y APIs REST/GraphQL/SOAP personalizadas.
  - **Archivos:** Parsers de Excel (.xlsx), CSV, JSON y XML cargados por el usuario en el chat.

### 3.9. Observabilidad
* **Responsabilidad:** Monitoreo técnico, de costes y auditoría de la plataforma de agentes.
* **Componentes Clave:**
  - **Trace Logging:** Captura el ciclo de vida completo de cada prompt (entrada del usuario -> planificación -> selección de agente -> llamadas a herramientas -> consulta a base de datos -> generación de respuesta).
  - **Calculador de Costes IA:** Mide el consumo de tokens de entrada/salida y las peticiones a APIs de LLMs por usuario, departamento y organización.
  - **Monitoreo de Latencia:** Alertas de rendimiento cuando una herramienta o consulta a base de datos supera los tiempos normales de respuesta.

### 3.10. LLM Provider Layer (Capa de Proveedor LLM)
* **Responsabilidad:** Desacoplar el core del sistema de los proveedores de inteligencia artificial.
* **Características:**
  - **Abstracción Común:** Define una interfaz única (`LLMClient`) con métodos como `generate_text`, `chat_completion`, `generate_embeddings` y `tool_calling`.
  - **Soporte Multi-Modelo:** Conectores listos para Google AI Studio (Gemini 2.5/2.0), OpenAI (GPT-4o), Anthropic (Claude 3.5), DeepSeek, e integraciones locales (Ollama/vLLM) para despliegues on-premise de alta seguridad.
  - **Fallback System:** Si Google AI Studio experimenta latencia o caída, el sistema redirige automáticamente la petición a un proveedor de respaldo (ej. OpenAI o modelo local) de forma transparente para el usuario.

---

## 4. Estrategia de Implementación Separada en 4 Prompts

A continuación se detallan **4 Prompts estructurados secuencialmente** para que un desarrollador o agente de codificación IA construya esta plataforma paso a paso, sin mezclar responsabilidades y garantizando un avance limpio y modular.

---

### PROMPT 1: Cimientos del Sistema — Base de Datos, Capa de Datos (Data Layer), Adaptadores y Abstracción de LLM (LLM Provider Layer)

```text
OBJETIVO:
Implementar los cimientos de datos y conectividad de la plataforma de agentes de inteligencia operacional. Esto incluye los adaptadores de bases de datos, la capa de abstracción semántica y la capa multi-proveedor de LLM.

TAREAS A REALIZAR:

1. Configuración de Base de Datos del Sistema (Backend Core):
   - Crear una base de datos relacional (PostgreSQL recomendado) para almacenar la configuración del sistema.
   - Definir los esquemas/modelos para:
     - `Organizations` (tenants)
     - `Users` con roles (Administrador, Operador, Logística, etc.)
     - `Workspaces` (espacios de trabajo dinámicos vinculados a un tenant)
     - `Conversations` (historial de chats vinculados a un workspace)
     - `Artifacts` (documento JSON que representa el estado, tipo y contenido del artefacto)

2. Implementación de LLM Provider Layer (Abstracción):
   - Crear un módulo 'llm_providers' en Python o Node.js que exponga una interfaz común 'LLMClient'.
   - Implementar el adaptador para Google AI Studio (Gemini API usando SDK oficial con soporte para Structured Outputs y Tool Calling).
   - Implementar un adaptador de reserva (ej. OpenAI o modelo simulado) para fallback.
   - Asegurar que el cambio de proveedor se configure fácilmente mediante variables de entorno (.env).

3. Capa de Adaptadores de Datos (Data & Connection Layer):
   - Implementar conectores modulares para bases de datos (PostgreSQL, MySQL/MariaDB, SQLite). Cada conector debe poder realizar consultas de solo lectura de manera segura y extraer esquemas de tablas (metadatos).
   - Crear un adaptador de carga y parsing de archivos (CSV, Excel) para que puedan ser consultados como tablas temporales en memoria.

4. Semantic Layer y Catálogo de Datos (Data Layer):
   - Crear una estructura JSON de configuración llamada 'semantic_map.json' donde se definan alias de negocio para columnas y tablas físicas (ej. "existencias" -> "inventory.stock_qty", "producto" -> "catalog.product_name").
   - Crear una clase 'SemanticTranslator' que tome consultas lógicas o asista a la generación de SQL reemplazando términos de negocio por términos físicos y aplicando filtros de tenant de forma obligatoria (ej. "WHERE tenant_id = X").

ENTREGABLES:
- Código del Backend inicial con migraciones de base de datos de sistema.
- Módulo 'llm_providers' completamente testeado con mockups del SDK de Gemini.
- Capa de adaptadores con pruebas unitarias de consulta de datos y extracción de metadatos.
- Capa semántica con traducción de términos empresariales a físicos.
```

---

### PROMPT 2: El Cerebro — Orquestador, Router de Agentes, Planificador y Capa de Herramientas (Tool Layer)

```text
OBJETIVO:
Implementar el motor de orquestación, el flujo de planificación del agente (Planner), el enrutamiento inteligente de consultas y el registro y ejecución de herramientas (Tool Layer).

TAREAS A REALIZAR:

1. Motor de Orquestación y Bucle de Ejecución (Orchestrator Core):
   - Crear el componente principal 'Orchestrator' encargado de gestionar el bucle de razonamiento y acción (ReAct o similar).
   - Implementar el 'ContextManager' que recupera el historial de conversación relevante, datos del usuario y el estado de los artefactos del workspace actual y los inyecta en el prompt de sistema del orquestador.
   - Implementar el 'MemoryManager' que realiza resúmenes periódicos de conversaciones largas para no saturar la ventana de contexto.

2. El Planificador (Planner):
   - Crear un módulo 'Planner' que use el LLM para descomponer solicitudes complejas del usuario (ej. "Analiza la operación e infórmame") en una lista de subtareas lógicas ordenadas.
   - El planificador debe emitir un JSON estructurado con los pasos a seguir.

3. Enrutador de Agentes (Agent Router) y Prompts de Agentes:
   - Crear un registro de agentes especializados.
   - Definir los prompts del sistema para al menos 4 agentes básicos: Agente Inventario, Agente Logística, Agente BI/Reportes y Agente Administrador.
   - Implementar el 'AgentRouter' que, utilizando embeddings o clasificación zero-shot con Gemini, decida qué agente o agentes específicos del registro deben ejecutar cada subtarea del plan.

4. Capa de Herramientas (Tool Layer):
   - Crear una clase base 'BaseTool' con metadatos JSON schema autogenerados para describir sus parámetros al LLM.
   - Implementar y registrar las siguientes herramientas básicas:
     - `RunQueryTool`: Recibe un string SQL validado y lo ejecuta en el adaptador correspondiente.
     - `GetDatabaseSchemaTool`: Retorna los metadatos de las tablas y campos del sistema.
     - `CreateArtifactTool`: Permite a los agentes indicar que quieren generar un artefacto visual con datos estructurados.
     - `SendEmailNotificationTool`: Simula o envía un correo con información.

ENTREGABLES:
- Motor de orquestación (Orchestrator) con soporte para colas de eventos o paso de mensajes.
- Sistema de agentes definidos mediante prompts y capacidades delimitadas.
- Registro y motor de ejecución de herramientas (Tool Layer) con validación estricta de esquemas de parámetros.
- Pruebas de integración donde una consulta compleja de usuario se planifique, se enrute a un agente, este llame a una herramienta de datos y devuelva el resultado estructurado.
```

---

### PROMPT 3: La Experiencia — Frontend Conversacional, Espacio de Trabajo Dinámico (Canvas) y Sistema de Artefactos

```text
OBJETIVO:
Crear la interfaz de usuario moderna y dinámica, implementando el chat conversacional, el panel lateral interactivo (Canvas/Workspace) y el sistema visual para renderizar artefactos de datos.

TAREAS A REALIZAR:

1. Estructura e Interfaz Base del Frontend:
   - Configurar una aplicación en React con Next.js y TailwindCSS usando una paleta de colores premium y moderna (modo oscuro por defecto, HSL estructurado, micro-transiciones suaves).
   - Diseñar el layout en pantalla dividida (*split screen*):
     - **Lado Izquierdo (40% de ancho):** Chat inteligente con hilos de conversación, barra de entrada enriquecida y selector de Workspaces.
     - **Lado Derecho (60% de ancho):** Workspace activo (Gemini Canvas), una zona interactiva que puede organizarse en cuadrícula (grid) o pestañas para mostrar los artefactos.

2. Chat Inteligente y Flujo Conversacional:
   - Implementar la UI de mensajería con soporte para burbujas de chat enriquecidas (Markdown renderizado).
   - Agregar micro-animaciones (ej. burbujas de carga dinámicas cuando los agentes están razonando, transiciones de aparición de mensajes).
   - Crear un componente de visualización del proceso del agente: un acordeón colapsable debajo del mensaje que muestre: *"Agente Logístico pensando..."*, *"Consultando tabla inventory..."*, *"Ejecutando SQL..."*, etc.

3. Componente de Artefactos Dinámicos (Artifact Panel):
   - Diseñar el sistema de componentes para renderizar artefactos basados en una estructura JSON común (ej. `{ id, type, title, data, config }`).
   - Crear componentes visuales robustos utilizando Tailwind y librerías de gráficos (ej. Recharts) para:
     - **Artefacto Tabla:** Tabla de datos con paginación, filtros locales por columna y botón de exportar.
     - **Artefacto Gráfico:** Soporte para gráficos de barras, líneas y pastel a partir del JSON devuelto por el agente.
     - **Artefacto Documento:** Vista de lectura de documentos tipo Markdown estructurados por el agente.
     - **Artefacto KPI Board:** Tarjetas con métricas destacadas y variaciones porcentuales.
   - Asegurar que estos artefactos sean interactivos (ej. hacer clic en una fila de la tabla puede enviar una pregunta automática al chat sobre ese elemento).

4. Integración Cliente-Servidor (WebSockets/SSE):
   - Conectar el chat y el Canvas al backend usando WebSockets (Socket.io o WebSockets nativos) o Server-Sent Events (SSE) para permitir la actualización parcial e incremental de los artefactos en pantalla a medida que los agentes los procesan en segundo plano.

ENTREGABLES:
- Código fuente de la interfaz del Frontend en Next.js/React.
- Estructura de estilos CSS base y configuración de Tailwind para diseño premium.
- Biblioteca de componentes de artefactos interactivos y responsivos.
- Integración de WebSockets en el frontend para comunicación bidireccional de chat y eventos de artefactos.
```

---

### PROMPT 4: Operación y Control — Workflows, Observabilidad, Notificaciones e Integraciones Finales

```text
OBJETIVO:
Implementar el motor de automatización de workflows en segundo plano, la observabilidad detallada del sistema (auditoría, trazabilidad, costes) y las notificaciones para flujos asíncronos de larga duración.

TAREAS A REALIZAR:

1. Motor de Workflows (Workflow Engine):
   - Crear un planificador de tareas en segundo plano que ejecute secuencias de acciones automatizadas definidas por el usuario o sugeridas por los agentes (ej. "Todos los lunes a las 8 AM, consultar stock, generar reporte y enviar por correo").
   - Utilizar un sistema de colas robusto (como Celery en Python o BullMQ en Node.js) con almacenamiento en Redis.
   - Diseñar la persistencia del estado de cada paso del workflow en la base de datos de sistema para poder pausar, reanudar o reintentar tareas fallidas.

2. Módulo de Observabilidad y Trazabilidad (Trace Engine):
   - Crear un middleware o interceptor en el backend para capturar todas las peticiones a los LLM y registrar de manera estructurada:
     - Prompts enviados y respuestas recibidas (con tokens exactos).
     - Llamadas a herramientas con sus parámetros de entrada y salida.
     - Latencia de cada paso del proceso de agentes.
   - Implementar un calculador de costes que asocie los tokens utilizados a las tarifas oficiales de los modelos de Google AI Studio / Gemini para registrar el gasto monetario real acumulado por conversación, usuario y organización.
   - Exponer un endpoint REST seguro para el "Panel de Agentes" que devuelva esta traza detallada en un formato legible.

3. Centro de Notificaciones Multicanal:
   - Crear un servicio de notificaciones en tiempo real en el Backend.
   - Enviar notificaciones internas al frontend (vía WebSockets) que aparezcan como alertas dinámicas en la UI (ej. "Workflow de Stock Crítico completado con éxito").
   - Implementar integraciones para el envío de notificaciones externas hacia plataformas de comunicación (adaptadores para Email, Slack webhooks y Microsoft Teams).

4. Consolidación de Seguridad y Despliegue:
   - Asegurar la autenticación JWT y la inyección estricta del ID de organización (`tenant_id`) en cada consulta a la capa de datos.
   - Validar que los adaptadores de bases de datos operen estrictamente con credenciales de solo lectura para evitar inyecciones SQL o borrado accidental de datos empresariales.
   - Proveer un script de inicio integrado (docker-compose recomendado) que levante el Frontend, Backend, Base de Datos del Sistema, Redis y la cola de tareas en segundo plano.

ENTREGABLES:
- Motor de workflows asíncronos basado en colas de tareas con reintentos y logs de estado.
- Módulo de trazabilidad y analítica de costes de IA completamente implementado.
- Sistema de notificaciones en tiempo real (WebSockets) y externas (Email/Slack).
- Configuración de seguridad perimetral de la API (multi-tenancy, sanitización de SQL, credenciales de solo lectura).
- Archivo Docker Compose o scripts de despliegue local que ejecuten la arquitectura completa unificada.
```
