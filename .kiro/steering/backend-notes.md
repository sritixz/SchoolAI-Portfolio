# Backend Notes

## JWT Token Expiration
Token expiration is set to **60 days** (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 60` in `config.py`).
- Students should stay logged in for 60 days without needing to re-authenticate.
- If you need to force logout all users (e.g., security incident), rotate `SECRET_KEY` in `.env`.

## SSE Streaming (LumiTutor / VinAI)
- `stream_vin_chat` in `services/llm.py` uses split `httpx.Timeout(connect=15, read=180)` — do not revert to a flat timeout.
- Both `/vin-ai/chat` and `/vin-ai/answer` return `Connection: keep-alive` and `Transfer-Encoding: chunked` headers — required for production proxy compatibility.
- If deploying behind nginx, ensure `proxy_buffering off` and `proxy_read_timeout 300s` are set for `/vin-ai/` routes.
