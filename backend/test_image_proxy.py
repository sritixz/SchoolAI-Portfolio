"""
Test script for the /teacher/image-proxy endpoint.

Run from the backend directory:
    python test_image_proxy.py

Requires the backend to be running on http://localhost:8001
and a valid teacher JWT token (set TOKEN below or pass as env var).
"""
import os
import sys
import httpx
import urllib.parse

BASE = os.getenv("API_BASE", "http://localhost:8001")
TOKEN = os.getenv("API_TOKEN", "")  # not needed for proxy, but kept for other tests

# ── 1. Test proxy directly (no auth needed) ───────────────────────────────────
SAMPLE_POLLINATIONS = (
    "https://image.pollinations.ai/prompt/"
    "A%20balance%20scale%20with%20x%2B5%20on%20left%2C%2010%20on%20right"
    "?width=512&height=384&nologo=true&model=flux&seed=12345"
)

def test_proxy_valid_url():
    print("\n[1] Testing proxy with valid Pollinations URL...")
    proxy_url = f"{BASE}/teacher/image-proxy?url={urllib.parse.quote(SAMPLE_POLLINATIONS, safe='')}"
    print(f"    Proxy URL: {proxy_url[:100]}...")
    try:
        r = httpx.get(proxy_url, timeout=90, follow_redirects=True)
        print(f"    Status: {r.status_code}")
        print(f"    Content-Type: {r.headers.get('content-type', 'N/A')}")
        print(f"    Content-Length: {len(r.content)} bytes")
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/"):
            print("    ✓ PASS — image returned successfully")
            return True
        else:
            print(f"    ✗ FAIL — unexpected response: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"    ✗ FAIL — exception: {e}")
        return False

def test_proxy_blocked_url():
    print("\n[2] Testing proxy rejects non-Pollinations URL...")
    bad_url = "https://example.com/image.png"
    proxy_url = f"{BASE}/teacher/image-proxy?url={urllib.parse.quote(bad_url, safe='')}"
    try:
        r = httpx.get(proxy_url, timeout=10)
        if r.status_code == 400:
            print("    ✓ PASS — correctly rejected non-Pollinations URL")
            return True
        else:
            print(f"    ✗ FAIL — expected 400, got {r.status_code}")
            return False
    except Exception as e:
        print(f"    ✗ FAIL — exception: {e}")
        return False

def test_proxy_no_url():
    print("\n[3] Testing proxy with missing url param...")
    try:
        r = httpx.get(f"{BASE}/teacher/image-proxy", timeout=10)
        if r.status_code == 422:
            print("    ✓ PASS — correctly returned 422 for missing param")
            return True
        else:
            print(f"    ✗ FAIL — expected 422, got {r.status_code}")
            return False
    except Exception as e:
        print(f"    ✗ FAIL — exception: {e}")
        return False

def test_backend_reachable():
    print(f"\n[0] Checking backend is reachable at {BASE}...")
    try:
        r = httpx.get(f"{BASE}/ping", timeout=5)
        if r.status_code == 200:
            print("    ✓ Backend is up")
            return True
        else:
            print(f"    ✗ Backend returned {r.status_code}")
            return False
    except Exception as e:
        print(f"    ✗ Cannot reach backend: {e}")
        print("    Make sure the backend is running: uvicorn main:app --port 8001")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Image Proxy Endpoint Tests")
    print("=" * 60)

    if not test_backend_reachable():
        sys.exit(1)

    results = [
        test_proxy_valid_url(),   # main test — actually fetches from Pollinations
        test_proxy_blocked_url(),
        test_proxy_no_url(),
    ]

    passed = sum(results)
    total = len(results)
    print(f"\n{'=' * 60}")
    print(f"Results: {passed}/{total} passed")
    if passed == total:
        print("✓ All tests passed — image proxy is working correctly")
    else:
        print("✗ Some tests failed — check output above")
    print("=" * 60)
    sys.exit(0 if passed == total else 1)
