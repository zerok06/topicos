# Prompts de Desarrollo: Servicio 4 - Operación y Control (Workflows y Observabilidad)

Este archivo contiene los sub-prompts secuenciales para implementar el motor de automatización de workflows, la trazabilidad/auditoría/costes de IA, el centro de notificaciones multicanal y el despliegue integrado con seguridad.

---

## Sub-prompt 4.1: Motor de Tareas y Workflows en Segundo Plano

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Crea el motor de flujos de trabajo (Workflow Engine) encargado de planificar y ejecutar automatizaciones asíncronas de larga duración basadas en colas.

Realiza las siguientes tareas:
1. Configura un sistema de colas en segundo plano (como BullMQ en Node.js o Celery en Python) utilizando Redis como broker de mensajería.
2. Define el esquema de base de datos para registrar un 'Workflow':
   - `{ id, name, trigger [cron_schedule, event_type], steps: [{ step_id, agent_type, tool, action_data }], status [pending, running, completed, failed], current_step_index }`.
3. Desarrolla el worker encargado de:
   - Levantar las tareas programadas (ej. mediante cron de Node/Python o programador externo).
   - Ejecutar de manera asíncrona la secuencia de llamadas a los agentes del orquestador.
   - Persistir en la base de datos el progreso de cada paso del workflow, permitiendo pausar, reanudar o reintentar ejecuciones fallidas.
4. Implementa pruebas para validar un workflow de prueba (por ejemplo, "Consulta diaria de stock crítico y generación de reporte").
```

---

## Sub-prompt 4.2: Trazabilidad, Auditoría y Analítica de Costes IA

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa el sistema de observabilidad para auditar accesos a datos, trazas de razonamiento y calcular costes económicos derivados del uso de proveedores de IA.

Realiza las siguientes tareas:
1. Desarrolla un middleware o interceptor en el backend que intercepte todas las peticiones a la capa 'LLM Provider Layer'.
2. Registra de manera estructurada en la base de datos (tabla `audit_logs`):
   - ID de usuario, ID de organización (tenant) e IP.
   - Prompt exacto enviado al LLM y respuesta recibida.
   - Cantidad de tokens de entrada (input tokens) y de salida (output tokens).
   - Parámetros de llamadas a herramientas (tools) y los datos SQL retornados.
   - Latencia exacta de procesamiento de la API externa de IA.
3. Desarrolla un calculador de costes ('CostCalculator') que aplique las tarifas de precios oficiales (por millón de tokens) del modelo configurado (ej. Gemini 2.5 Pro/Flash) y guarde el costo monetario de cada consulta.
4. Crea endpoints administrativos para consultar el histórico de auditoría y reportar el gasto de IA acumulado por organización, departamento o usuario.
```

---

## Sub-prompt 4.3: Centro de Notificaciones Multicanal

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Diseña y desarrolla el centro de notificaciones multicanal para alertar a los usuarios en tiempo real sobre eventos del sistema y workflows de larga duración finalizados.

Realiza las siguientes tareas:
1. Crea un servicio 'NotificationService' en el backend.
2. Implementa los siguientes canales de envío:
   - **Notificaciones In-App (WebSockets):** Envío de notificaciones rápidas al frontend del usuario activo para mostrar alertas tipo popups o toasts en la interfaz (ej. "Su reporte mensual ha sido generado").
   - **Correo Electrónico (SMTP/SendGrid/SES):** Servicio para enviar correos electrónicos formateados con plantillas HTML (ej. adjuntar el archivo Excel o PDF generado por el agente).
   - **Webhooks Externos (Slack/Teams):** Integración saliente parametrizable por tenant para enviar resúmenes a canales corporativos de Slack o Microsoft Teams.
3. Permite a los usuarios activar o desactivar canales específicos para cada tipo de alerta operativa.
```

---

## Sub-prompt 4.4: Consolidación de Seguridad y Despliegue Local

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa las medidas de seguridad perimetral de datos y empaqueta la infraestructura completa del sistema para ejecución local.

Realiza las siguientes tareas:
1. Configura la autenticación y autorización mediante JWT para asegurar todas las llamadas REST y los canales de conexión de WebSockets.
2. Asegura que las credenciales de conexión del data layer de bases de datos de clientes operen estrictamente con privilegios de solo lectura (SELECT) a nivel de motor de base de datos para prevenir inyecciones SQL o borrados de tablas operativas.
3. Crea un archivo `docker-compose.yml` que empaquete:
   - Contenedor del Frontend (Next.js)
   - Contenedor del Backend API (FastAPI/NestJS)
   - Base de datos PostgreSQL de sistema
   - Instancia de Redis (para colas y caché)
   - Worker para procesamiento en segundo plano (Celery/BullMQ)
4. Incluye un script de inicialización (`seed`) que cree de forma automática un tenant de prueba, un usuario administrador de demostración y conexiones simuladas para pruebas iniciales inmediatas.
```
