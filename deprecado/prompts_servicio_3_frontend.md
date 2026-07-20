# Prompts de Desarrollo: Servicio 3 - Frontend (Experiencia de Usuario)

Este archivo contiene los sub-prompts secuenciales para construir la UI base premium, la trazabilidad visual en tiempo real de los agentes, los componentes de artefactos y la conectividad por WebSockets.

---

## Sub-prompt 3.1: Interfaz Base Premium, Chat y Pantalla Dividida (Split Screen)

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Configura la aplicación de interfaz de usuario (Frontend) utilizando React con Next.js y TailwindCSS, con un enfoque estético premium y soporte para pantallas divididas.

Realiza las siguientes tareas:
1. Crea un proyecto Next.js limpio con soporte de TypeScript.
2. Configura una paleta de colores moderna (modo oscuro por defecto usando Slate/Zinc como bases, Indigo/Violeta como acentos, bordes sutiles y efectos de vidrio esmerilado/glassmorphism).
3. Diseña el Layout en pantalla dividida (Split Screen):
   - **Sidebar izquierdo colapsable:** Listado de workspaces persistentes y conversaciones anteriores.
   - **Columna Chat (40% de ancho):** Ventana de mensajería interactiva con burbujas de diálogo diferenciadas para el usuario y los agentes, cargadores de escritura (typing indicators) y entrada de texto enriquecida.
   - **Columna Canvas / Workspace (60% de ancho):** Área dinámica que puede organizarse en cuadrícula para albergar y anclar múltiples artefactos generados.
4. Implementa micro-interacciones suaves con Tailwind/Framer Motion para colapsar paneles y transiciones de carga de mensajes.
```

---

## Sub-prompt 3.2: Trazabilidad del Agente en Tiempo Real (Step Tracer)

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Diseña e implementa el componente de trazabilidad del agente (Step Tracer) para mostrar paso a paso la ejecución y toma de decisiones del orquestador en tiempo real.

Realiza las siguientes tareas:
1. Crea un componente en React llamado 'AgentExecutionTrace' que se muestre de forma colapsable debajo del mensaje activo del agente en el chat.
2. El componente debe renderizar una línea de tiempo o lista de pasos que cambie dinámicamente según eventos recibidos:
   - Agente seleccionado (ej. "Agente Logístico")
   - Tarea asignada (ej. "Consultando disponibilidad de stock...")
   - Herramienta en ejecución (ej. "SQL Query Tool en tabla 'orders'")
   - Estado de la llamada (Cargando, Exitoso, Fallido)
3. Añade loaders sutiles tipo pulso y cambios de colores según el estado (verde para éxito, rojo para fallos).
4. Crea una simulación de estados de ejemplo en el frontend para probar el comportamiento visual del componente sin conexión real con el servidor.
```

---

## Sub-prompt 3.3: Componentes de Artefactos Interactivos

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Construye la biblioteca de componentes encargados de renderizar visualmente los artefactos dinámicos en el panel de Canvas/Workspace a partir de estructuras JSON.

Realiza las siguientes tareas:
1. Diseña un renderizador de artefactos genérico que lea una estructura JSON estándar, ej: `{ id, type, title, data: [...] }`.
2. Implementa los siguientes componentes específicos de artefactos utilizando Tailwind y librerías de gráficos (como Recharts o D3):
   - **ArtifactTable:** Tabla interactiva que soporte ordenamiento de columnas, paginación, filtros de texto por campos y un botón para descargar como CSV.
   - **ArtifactChart:** Gráficos responsivos de barras, líneas y pastel a partir de los datos y configuración de ejes provistos en el JSON.
   - **ArtifactDocument:** Renderizado de contenido Markdown enriquecido con soporte para listas, tablas y secciones colapsables.
   - **ArtifactKPI:** Tarjetas con métricas destacadas, indicadores porcentuales de subida/bajada y minigráficos de tendencia (sparklines).
3. Asegura que los componentes sean interactivos (ej. al hacer clic en un dato o fila de la tabla, se pueda enviar una pregunta contextual sugerida automáticamente al chat).
```

---

## Sub-prompt 3.4: Conectividad WebSockets y SSE para el Workspace

Copie y pegue el siguiente texto en su asistente de codificación:

```text
Implementa el sistema de comunicación bidireccional mediante WebSockets (o Server-Sent Events - SSE) para transmitir en tiempo real las respuestas de los agentes y los cambios en el Canvas.

Realiza las siguientes tareas:
1. Integra un cliente WebSocket (como socket.io-client) en el Frontend de React.
2. Escucha y maneja los siguientes eventos emitidos por el Backend:
   - `agent_stream_token`: Para renderizar la respuesta textual del agente palabra por palabra.
   - `agent_trace_step`: Para actualizar dinámicamente los pasos del componente 'AgentExecutionTrace'.
   - `artifact_created` o `artifact_updated`: Para instanciar en el Canvas el nuevo artefacto o actualizar su contenido de forma asíncrona.
3. Implementa lógica de reconexión automática en caso de caídas de red y visualización de estado de conexión al usuario ("Conectado", "Reconectando...").
```
