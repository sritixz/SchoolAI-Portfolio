import asyncio
import sys
sys.path.insert(0, '.')
from services.llm import chat_completion

async def test():
    try:
        result = await chat_completion([
            {"role": "system", "content": "You are a helpful assistant. Return only valid JSON."},
            {"role": "user", "content": "Return this JSON: {\"test\": true}"}
        ])
        print("SUCCESS:", result[:300])
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e))

asyncio.run(test())
