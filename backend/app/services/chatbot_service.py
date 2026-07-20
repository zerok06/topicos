import os
import re
import logging
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import check_semantic_cache, save_to_semantic_cache, embedder
from app.repositories.inventory_repository import InventoryRepository

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.groq_api_key,
    base_url=settings.groq_base_url
)
MODEL_NAME = settings.groq_model
MAX_TOKENS = settings.groq_max_tokens
TEMPERATURE = settings.groq_temperature

def sanitize_input(user_input: str) -> str:
    """LLM01: Sanitizador para evitar inyección de prompts."""
    suspicious_patterns = [
        r"(?i)\b(ignore|olvida)\b.*?(instrucciones|instructions)",
        r"(?i)(system:|sistema:|eres un bot)",
        r"(?i)bypass"
    ]
    
    sanitized = user_input
    for pattern in suspicious_patterns:
        sanitized = re.sub(pattern, "[BLOQUEADO]", sanitized)
    
    return sanitized

def sanitize_output(llm_output: str) -> str:
    """Sanitiza la respuesta del LLM — react-markdown no renderiza HTML, es seguro por defecto."""
    return llm_output

def _is_warehouse_question(question: str) -> bool:
    """Detecta si la pregunta es sobre almacenes o inventario general."""
    warehouse_keywords = [
        "almacen", "almacén", "warehouse", "inventario", "stock total",
        "mas inventario", "más inventario", "menos inventario",
        "que almacen", "qué almacén", "cuanto stock", "cuánto stock",
        "distribucion", "distribución", "sede", "sucursal", "ciudad",
        "lima", "arequipa", "moquegua", "critico", "crítico",
        "stock critico", "stock crítico", "agotado", "stock bajo",
    ]
    q_lower = question.lower()
    return any(kw in q_lower for kw in warehouse_keywords)

def _is_barcode_question(question: str) -> bool:
    """Detecta si la pregunta es una búsqueda por código de barras/SKU."""
    barcode_keywords = ["sku", "codigo", "código", "barcode", "barras", "escane", "scan"]
    q_lower = question.lower()
    return any(kw in q_lower for kw in barcode_keywords)

def _build_warehouse_context(warehouse_summary: list[dict], full_inventory: list[dict]) -> str:
    """Construye el contexto del inventario por almacén."""
    lines = []
    
    # Resumen por almacén
    lines.append("=== RESUMEN DE ALMACENES ===")
    for ws in warehouse_summary:
        lines.append(
            f"- {ws['warehouse_name']} ({ws['city'] or 'N/A'}): "
            f"{ws['total_stock']} unidades en stock, "
            f"{ws['product_count']} productos, "
            f"{ws['critical_count']} productos en stock critico"
        )
    
    # Detalle de inventario
    lines.append("\n=== DETALLE DE INVENTARIO POR ALMACEN ===")
    current_warehouse = None
    for item in full_inventory:
        wh_name = item["warehouse_name"]
        if wh_name != current_warehouse:
            current_warehouse = wh_name
            lines.append(f"\n  [{wh_name} - {item['city'] or 'N/A'}]")
        
        status = "CRITICO" if item["is_critical"] else "OK"
        lines.append(
            f"    - SKU: {item['sku']} | {item['product_name']} "
            f"| Modelo: {item['model'] or 'N/A'} | Stock: {item['stock_qty']} "
            f"(min: {item['min_stock']}, max: {item['max_stock'] or 'N/A'}) "
            f"| ${item['unit_price']} | {status}"
        )
    
    return "\n".join(lines)

def _build_product_context(similar_embeddings) -> str:
    """Construye el contexto de productos desde embeddings."""
    context_items = []
    for emb in similar_embeddings:
        p = emb.product
        if p:
            context_items.append(
                f"- SKU: {p.sku} | Producto: {p.product_name} | Modelo: {p.model} | "
                f"Genero: {p.gender} | Precio: ${p.unit_price} | Descripcion: {p.description}"
            )
    return "\n".join(context_items) if context_items else ""

def _build_barcode_context(products: list[dict]) -> str:
    """Construye el contexto para una búsqueda por código de barras."""
    if not products:
        return "No se encontro ningun producto con ese codigo."
    
    lines = ["=== PRODUCTOS ENCONTRADOS ==="]
    for p in products:
        lines.append(
            f"- SKU: {p['sku']} | Producto: {p['product_name']} | "
            f"Modelo: {p['model'] or 'N/A'} | Precio: ${p['unit_price']}"
        )
    return "\n".join(lines)

async def ask_logistics_chatbot(user_question: str, db_session: AsyncSession) -> str:
    """Funcion principal para procesar la pregunta del usuario utilizando RAG."""
    
    clean_question = sanitize_input(user_question)
    inv_repo = InventoryRepository(db_session)
    
    # 1. Intentar cache semantica con Redis (con manejo de errores)
    try:
        cached_response = await check_semantic_cache(clean_question)
        if cached_response:
            return cached_response
    except Exception as e:
        logger.warning(f"Redis cache check failed (non-fatal): {e}")
    
    # 2. Detectar tipo de pregunta y construir contexto
    is_warehouse_q = _is_warehouse_question(clean_question)
    is_barcode_q = _is_barcode_question(clean_question)
    
    product_context = ""
    warehouse_context = ""
    
    # Buscar productos por codigo de barras/SKU
    if is_barcode_q:
        try:
            barcode_products = await inv_repo.get_products_by_barcode(clean_question)
            product_context = _build_barcode_context(barcode_products)
        except Exception as e:
            logger.error(f"Barcode search failed: {e}")
    
    # Buscar embeddings semanticos (siempre, para enriquecer contexto)
    try:
        question_embedding = embedder.encode(clean_question).tolist()
        similar_embeddings = await inv_repo.search_similar_products(question_embedding, limit=5)
        emb_context = _build_product_context(similar_embeddings)
        if emb_context:
            product_context = f"{product_context}\n{emb_context}" if product_context else emb_context
    except Exception as e:
        logger.error(f"Embedding/pgvector search failed: {e}")
    
    # Siempre obtener contexto de almacenes e inventario
    try:
        warehouse_summary = await inv_repo.get_warehouse_inventory_summary()
        full_inventory = await inv_repo.get_full_inventory_context()
        warehouse_context = _build_warehouse_context(warehouse_summary, full_inventory)
    except Exception as e:
        logger.error(f"Warehouse inventory context failed: {e}")
    
    # 3. Construir el prompt del sistema con todo el contexto
    full_context_parts = []
    if warehouse_context:
        full_context_parts.append(warehouse_context)
    if product_context:
        full_context_parts.append(f"\n=== PRODUCTOS RELACIONADOS ===\n{product_context}")
    
    full_context = "\n".join(full_context_parts) if full_context_parts else "No se encontro informacion de inventario."
    
    system_prompt = f"""Eres un Asistente Logistico IA experto de Nike. Tienes acceso completo al inventario de todos los almacenes.

INVENTARIO COMPLETO:
{full_context}

INSTRUCCIONES:
1. Responde de forma concisa y directa en espanol.
2. Formatea tus respuestas usando **Markdown**: usa **negritas** para enfasis, listas con `-`, tablas cuando compares datos, `codigo` para SKUs numericos. Usa bloques ```mermaid para diagramas de flujo cuando sea util visualizar procesos logisticos. Separa secciones con `---`.
3. Cuando pregunten sobre almacenes, usa la seccion "RESUMEN DE ALMACENES" y "DETALLE DE INVENTARIO POR ALMACEN".
4. Cuando pregunten sobre stock critico, filtra los productos marcados como CRITICO.
5. Cuando pregunten por un producto especifico, busca en el detalle de inventario.
6. Si preguntan que almacen tiene mas inventario, compara los totales de stock de cada almacen y responde cual tiene mas.
7. Incluye numeros concretos: cantidades, SKUs, nombres de almacenes.
8. Si la informacion no esta en el contexto, di que no tienes esa informacion especifica.
9. No inventes datos que no esten en el contexto."""

    # 4. Llamar al LLM (con manejo de errores)
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": clean_question}
            ],
            model=MODEL_NAME,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
        )
        
        raw_response = chat_completion.choices[0].message.content
    except Exception as e:
        logger.error(f"LLM API call failed: {e}")
        # Fallback: responder directamente desde los datos
        if is_warehouse_q and warehouse_context:
            return _fallback_warehouse_response(clean_question, warehouse_context)
        if product_context:
            return f"Encontre estos productos relacionados:\n\n{product_context}\n\n(El modelo de IA no esta disponible, pero aqui estan los datos del catalogo.)"
        return "Lo siento, el servicio de IA no esta disponible en este momento. Por favor, intenta mas tarde."

    safe_response = sanitize_output(raw_response)
    
    # 5. Guardar en cache semantica de Redis (con manejo de errores)
    try:
        await save_to_semantic_cache(clean_question, safe_response)
    except Exception as e:
        logger.warning(f"Redis cache save failed (non-fatal): {e}")
    
    return safe_response

def _fallback_warehouse_response(question: str, warehouse_context: str) -> str:
    """Genera una respuesta de fallback basada en datos de almacenes cuando el LLM falla."""
    q_lower = question.lower()
    
    if "mas" in q_lower and "inventario" in q_lower:
        lines = warehouse_context.split("\n")
        summary_lines = [l for l in lines if l.startswith("- ") and "unidades en stock" in l]
        if summary_lines:
            return f"Segun los datos del inventario:\n\n" + "\n".join(summary_lines[:3]) + "\n\nEl primer almacen listado tiene el mayor inventario."
    
    if "critico" in q_lower:
        lines = warehouse_context.split("\n")
        critical_lines = [l for l in lines if "CRITICO" in l]
        if critical_lines:
            return f"Productos en stock critico:\n\n" + "\n".join(critical_lines)
        return "No hay productos en stock critico actualmente."
    
    return f"Aqui tienes la informacion del inventario:\n\n{warehouse_context[:1000]}"
