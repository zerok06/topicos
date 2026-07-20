# Prompts de Desarrollo: Servicio 2 - Orchestrator (El Cerebro)

Este archivo contiene los sub-prompts secuenciales para implementar el bucle de orquestación, el planificador, los agentes especializados y la capa de herramientas.

---

## Sub-prompt 2.1: Bucle de Orquestación y Gestores de Contexto y Memoria

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa el motor central de orquestación (Orchestrator) y los gestores asociados de contexto y memoria conversacional de la plataforma.

Realiza las siguientes tareas:
1. Diseña la clase o componente principal 'Orchestrator' encargado de gestionar el flujo conversacional y el bucle de razonamiento y acción (ReAct).
2. Desarrolla el 'ContextManager' para:
   - Recuperar el historial de los últimos mensajes del chat.
   - Extraer la información del usuario (rol, organización) y el estado actual de los artefactos del workspace.
   - Construir e inyectar dinámicamente este contexto en el prompt del sistema del orquestador.
3. Implementa el 'MemoryManager':
   - Almacena el historial completo de conversaciones en la base de datos de sistema.
   - Si la conversación supera un umbral de tokens definido, llama al LLM de forma asíncrona para resumir los mensajes antiguos.
   - Almacena el resumen en base de datos para utilizarlo como prefijo de memoria en turnos futuros.
4. Escribe pruebas unitarias que simulen una conversación de varios turnos y verifiquen que el contexto y la memoria de resumen se actualicen correctamente.
```

---

## Sub-prompt 2.2: Planificador de Objetivos Complejos (Planner)

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Construye el componente Planificador (Planner) para descomponer solicitudes complejas del usuario en un conjunto de subtareas ejecutables por agentes especializados.

Realiza las siguientes tareas:
1. Crea un módulo 'Planner' en el backend.
2. Configura un prompt de sistema para que el LLM actúe como un planificador de operaciones. El Planner debe recibir la consulta del usuario (ej. "Analiza la operación e infórmame") y el catálogo de datos y agentes disponibles.
3. Haz que el Planner devuelva un JSON estructurado con el siguiente esquema:
   - `steps`: Array de objetos con:
     - `step_id` (identificador único del paso)
     - `agent_type` (tipo de agente especializado requerido)
     - `objective` (meta textual de la subtarea)
     - `dependencies` (lista de step_ids que deben completarse antes de ejecutar este paso)
4. Implementa un motor de validación de dependencias (por ejemplo, validación de Grafo Acíclico Dirigido - DAG) para asegurar que no existan bucles infinitos en el plan.
5. Crea pruebas unitarias que verifiquen la correcta descomposición y orden secuencial/paralelo de las subtareas para solicitudes complejas.
```

---

## Sub-prompt 2.3: Enrutador de Agentes y Sistema de Prompts Especializados

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Desarrolla el registro de agentes especializados y el enrutador inteligente encargado de asignar tareas según las capacidades de cada agente.

Realiza las siguientes tareas:
1. Crea un 'AgentRegistry' para registrar y consultar instancias de agentes.
2. Define los prompts de sistema (System Prompts) y políticas de comportamiento estrictas para los siguientes agentes base:
   - **Agente Inventario:** Especialista en stock, almacenes, movimientos y rotación.
   - **Agente Logística:** Especialista en transporte, rutas de entrega y despachos.
   - **Agente BI (Business Intelligence):** Especialista en predicciones (forecasts), KPIs y análisis matemático.
   - **Agente Administrador:** Acceso a la configuración global y diagnósticos de fallos.
3. Implementa el 'AgentRouter', el cual recibe un paso del planificador y, evaluando de forma semántica las descripciones y roles de cada agente del registro, decide a cuál delegarle la tarea.
4. Agrega pruebas unitarias que validen que las tareas de inventario se enruten al Agente de Inventario, las de BI al Agente de BI, etc.
```

---

## Sub-prompt 2.4: Registro y Ejecución de Herramientas (Tool Layer)

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa la capa de herramientas (Tool Layer) que permite a los agentes ejecutar acciones lógicas externas con validación estricta de esquemas de parámetros.

Realiza las siguientes tareas:
1. Diseña una clase abstracta 'BaseTool' que genere automáticamente el esquema JSON schema de sus argumentos para describirse ante el LLM.
2. Desarrolla y registra en la capa de herramientas:
   - `RunSQLQueryTool`: Valida y ejecuta código SQL de solo lectura en los adaptadores.
   - `GetSemanticSchemaTool`: Retorna el catálogo y mapa semántico al agente.
   - `CreateArtifactTool`: Permite al agente emitir datos estructurados que formarán un artefacto visual.
   - `SendEmailNotificationTool`: Permite enviar notificaciones por correo.
3. Implementa un sistema de validación de permisos: antes de ejecutar una herramienta, verifica que el agente llamador y el rol de usuario tengan los permisos habilitados en base de datos.
4. Escribe pruebas unitarias que simulen llamadas correctas e incorrectas de agentes a herramientas, validando que el backend rechace parámetros mal formados o llamadas no autorizadas.
```
