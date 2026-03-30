"""
Pinecone vector store — used for Vin AI semantic search over
curriculum content, past doubts, and remediation material.
"""
from pinecone import Pinecone, ServerlessSpec
from config import settings

_pc: Pinecone = None
_index = None

def get_pinecone():
    global _pc, _index
    if _pc is None:
        _pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        if settings.PINECONE_INDEX not in [i.name for i in _pc.list_indexes()]:
            _pc.create_index(
                name=settings.PINECONE_INDEX,
                dimension=1536,  # text-embedding-3-small
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region=settings.PINECONE_ENV),
            )
        _index = _pc.Index(settings.PINECONE_INDEX)
    return _index

async def upsert_vectors(vectors: list[dict]):
    """vectors: [{"id": str, "values": list[float], "metadata": dict}]"""
    idx = get_pinecone()
    idx.upsert(vectors=vectors)

async def query_vectors(query_vector: list[float], top_k: int = 5, filter: dict = None) -> list[dict]:
    idx = get_pinecone()
    result = idx.query(vector=query_vector, top_k=top_k, include_metadata=True, filter=filter)
    return result.get("matches", [])

async def get_embedding(text: str) -> list[float]:
    """Get embedding via OpenRouter-compatible endpoint (or swap for OpenAI directly)."""
    import httpx
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"model": "openai/text-embedding-3-small", "input": text}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/embeddings",
            headers=headers, json=payload,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]
