"""
OpenRouter LLM client — used by Vin AI and teacher AI tools.
"""
import httpx
from config import settings

def _headers():
    """Build headers fresh each call so the API key is never stale."""
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bawan.app",
        "X-Title": "Bawan AI",
    }

async def chat_completion(messages: list[dict], model: str = None, stream: bool = False, timeout: int = 120) -> str:
    """Send a chat completion request to OpenRouter. Returns full text."""
    payload = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": messages,
        "stream": stream,
    }
    hdrs = _headers()
    # Debug: log key prefix to verify it's loaded
    key_val = settings.OPENROUTER_API_KEY
    print(f"[LLM DEBUG] Key length={len(key_val)}, starts='{key_val[:12]}...', model={payload['model']}")
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=hdrs,
            json=payload,
        )
        if resp.status_code == 401:
            body = resp.text
            print(f"[LLM DEBUG] 401 response body: {body}")
            raise Exception(f"OpenRouter auth failed (401). Response: {body}")
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
                                 headers=_headers(), json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta


async def stream_vin_chat(messages: list[dict], model: str = None):
    """
    Async generator for Vin AI SSE streaming.
    Yields raw text tokens from the LLM (XML fragments).
    Uses gemini-flash via OpenRouter.
    """
    import json as _json
    vin_model = model or getattr(settings, "VIN_MODEL", None) or settings.OPENROUTER_MODEL
    payload = {
        "model": vin_model,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 1024,
    }
    # Split timeout: 15s to connect, 180s to read (first token can be slow in prod)
    timeout = httpx.Timeout(connect=15.0, read=180.0, write=15.0, pool=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=_headers(),
            json=payload,
        ) as resp:
            resp.raise_for_status()
            # Use aiter_bytes + manual split to avoid proxy buffering stalls
            buf = ""
            async for chunk in resp.aiter_bytes():
                buf += chunk.decode("utf-8", errors="replace")
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    line = line.strip()
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:].strip()
                    if raw == "[DONE]":
                        return
                    try:
                        data = _json.loads(raw)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except Exception:
                        continue
