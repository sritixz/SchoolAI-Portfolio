"""
OpenRouter LLM client — used by Vin AI and teacher AI tools.
"""
import httpx
from config import settings

HEADERS = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://bawan.app",
    "X-Title": "Bawan AI",
}

async def chat_completion(messages: list[dict], model: str = None, stream: bool = False) -> str:
    """Send a chat completion request to OpenRouter. Returns full text."""
    payload = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": messages,
        "stream": stream,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=HEADERS,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

async def stream_completion(messages: list[dict], model: str = None):
    """Async generator that yields text chunks for SSE streaming."""
    payload = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": messages,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                                 headers=HEADERS, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
