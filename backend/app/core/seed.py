import asyncio
import sys
import os
from fastembed import TextEmbedding
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add the backend directory to sys.path so we can run this directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import CentralSessionLocal
from app.models.inventory import Product, ProductEmbedding

async def seed_vector_db():
    print("Iniciando semillero de embeddings vectoriales...")
    
    # Cargar el modelo fastembed
    print("Cargando modelo TextEmbedding('sentence-transformers/all-MiniLM-L6-v2')...")
    model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("Modelo cargado exitosamente.")

    async with CentralSessionLocal() as session:
        # Obtener todos los productos
        result = await session.execute(select(Product))
        products = result.scalars().all()
        print(f"Se encontraron {len(products)} productos en la base de datos central.")

        count = 0
        for product in products:
            if not product.description:
                continue

            # Buscar si ya existe el embedding
            embed_result = await session.execute(
                select(ProductEmbedding).where(ProductEmbedding.product_id == product.product_id)
            )
            embedding_record = embed_result.scalar_one_or_none()

            # Texto para generar el embedding: nombre + descripción
            text_to_vectorize = f"{product.product_name}: {product.description}"
            vector = list(model.embed([text_to_vectorize]))[0].tolist()

            if embedding_record:
                embedding_record.description_vector = vector
                if not embedding_record.context_metadata:
                    embedding_record.context_metadata = {}
                embedding_record.context_metadata["vectorized"] = True
                embedding_record.context_metadata["text"] = text_to_vectorize
            else:
                embedding_record = ProductEmbedding(
                    product_id=product.product_id,
                    description_vector=vector,
                    context_metadata={
                        "sku": product.sku,
                        "product_name": product.product_name,
                        "unit_price": float(product.unit_price) if product.unit_price else 0.0,
                        "vectorized": True,
                        "text": text_to_vectorize
                    }
                )
                session.add(embedding_record)
            
            count += 1
            if count % 5 == 0:
                print(f"Procesados {count}/{len(products)} embeddings...")

        await session.commit()
        print(f"¡Semillero completado! Se guardaron {count} embeddings vectoriales.")

if __name__ == "__main__":
    asyncio.run(seed_vector_db())
