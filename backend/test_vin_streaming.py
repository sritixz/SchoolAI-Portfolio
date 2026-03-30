"""
Quick test script for Vin AI streaming endpoint.
Run: python test_vin_streaming.py
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:8000"
TOKEN = None  # Will be set after login

async def login():
    """Login as a student and get token."""
    global TOKEN
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{API_URL}/auth/login", json={
            "email": "student@test.com",  # Change to your test student
            "password": "password123"
        })
        if resp.status_code == 200:
            TOKEN = resp.json()["access_token"]
            print("✓ Logged in successfully")
        else:
            print(f"✗ Login failed: {resp.text}")
            exit(1)

async def test_streaming_chat():
    """Test SSE streaming chat endpoint."""
    print("\n─── Testing /vin-ai/chat streaming ───")
    
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST",
            f"{API_URL}/vin-ai/chat",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={
                "message": "How do I solve quadratic equations using the formula?",
                "history": []
            }
        ) as resp:
            if resp.status_code != 200:
                print(f"✗ Request failed: {resp.status_code}")
                return
            
            print("✓ Stream started, receiving tokens...\n")
            buffer = ""
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        print("\n\n✓ Stream completed")
                        break
                    # Unescape newlines
                    token = data.replace("\\n", "\n")
                    buffer += token
                    print(token, end="", flush=True)
            
            print(f"\n\n─── Full XML Response ───\n{buffer}\n")

async def test_history():
    """Test fetching doubt history."""
    print("\n─── Testing /vin-ai/history ───")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_URL}/vin-ai/history",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        if resp.status_code == 200:
            history = resp.json()
            print(f"✓ Found {len(history)} conversations")
            if history:
                latest = history[0]
                print(f"  Latest: {latest['question'][:50]}...")
                print(f"  Subject: {latest['subject']}")
                print(f"  Preview: {latest['preview'][:80]}...")
        else:
            print(f"✗ Failed: {resp.text}")

async def main():
    print("═══════════════════════════════════════")
    print("   Vin AI Streaming Test")
    print("═══════════════════════════════════════")
    
    await login()
    await test_streaming_chat()
    await test_history()
    
    print("\n✓ All tests completed")

if __name__ == "__main__":
    asyncio.run(main())
