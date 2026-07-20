import json
import os
import numpy as np
import redis.asyncio as redis
from fastembed import TextEmbedding

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD", None),
    decode_responses=True
)
embedder = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def cos_sim(a, b):
    a = np.array(a)
    b = np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

async def check_semantic_cache(user_question: str, threshold: float = 0.95):
    """Calcula el embedding y busca en Redis una pregunta similar (>95%)"""
    # fastembed genera un generador; extraemos el primer elemento
    question_embedding = list(embedder.embed([user_question]))[0]

    keys = await redis_client.keys("cache:chat:*")
    
    best_match_response = None
    highest_score = 0.0

    for key in keys:
        cached_data = await redis_client.get(key)
        if cached_data:
            data = json.loads(cached_data)
            cached_embedding = data.get("embedding")
            
            # Comparamos matemáticamente los vectores con cos_sim
            similarity = cos_sim(question_embedding, cached_embedding)
            
            if similarity > highest_score and similarity >= threshold:
                highest_score = similarity
                best_match_response = data.get("response")

    return best_match_response

async def save_to_semantic_cache(user_question: str, bot_response: str):
    """Guarda la pregunta y la respuesta en Redis por 24 horas"""
    question_embedding = list(embedder.embed([user_question]))[0].tolist()
    cache_key = f"cache:chat:{abs(hash(user_question))}"
    
    cache_data = {
        "question": user_question,
        "embedding": question_embedding,
        "response": bot_response
    }
    
    await redis_client.setex(cache_key, 86400, json.dumps(cache_data))