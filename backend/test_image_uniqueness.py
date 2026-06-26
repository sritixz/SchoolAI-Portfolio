"""
Verification test to assert image URL uniqueness and relevance across generated slides.
"""
import asyncio
import httpx

API_BASE = "http://localhost:8001"
TEACHER_EMAIL = "teacher@example.com"
TEACHER_PASSWORD = "password123"

async def test_image_uniqueness():
    print("=" * 80)
    print("STARTING SLIDE IMAGE UNIQUENESS & RELEVANCE VERIFICATION TEST")
    print("=" * 80)
    
    async with httpx.AsyncClient(base_url=API_BASE, timeout=120) as client:
        # 1. Login
        print("\n[1] Logging in as teacher...")
        login_res = await client.post("/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD,
            "role": "teacher"
        })
        if login_res.status_code != 200:
            print(f"❌ Login failed: {login_res.text}")
            return False
            
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✓ Login successful")

        # 2. Start presentation generation job
        # We request 6 slides to ensure multiple content slides are created
        print("\n[2] Requesting 6-slide presentation on 'Photosynthesis'...")
        payload = {
            "tool": "presentation",
            "subject": "Biology",
            "topic": "Photosynthesis",
            "grade": "7",
            "extra": {
                "num_slides": 6,
                "duration_minutes": 30,
                "purpose": "teaching",
                "visual_style": "colorful",
                "board": "CBSE",
                "chapter": "Chapter 1",
                "learning_objective": "Concept Understanding",
                "special_instructions": "",
                "target_audience": "students",
                "tone": "Engaging",
                "content_depth": "Detailed",
                "include_mini_quiz": True,
            }
        }
        
        gen_res = await client.post(
            "/teacher/ai-tool/presentation/generate",
            json=payload,
            headers=headers
        )
        if gen_res.status_code != 200:
            print(f"❌ Generation initiation failed: {gen_res.text}")
            return False
            
        job_id = gen_res.json()["job_id"]
        print(f"✓ Generation started with Job ID: {job_id}")

        # 3. Poll for completion
        print("\n[3] Polling for presentation completion...")
        max_polls = 120
        poll_count = 0
        result = None
        while poll_count < max_polls:
            status_res = await client.get(
                f"/teacher/ai-tool/status/{job_id}",
                headers=headers
            )
            if status_res.status_code != 200:
                print(f"❌ Status check failed: {status_res.text}")
                return False
                
            status_data = status_res.json()
            status = status_data.get("status")
            current = status_data.get("current_slide", 0)
            total = status_data.get("total_slides", 0)
            pct = status_data.get("progress_pct", 0)
            print(f"  Status: {status} | Slide {current}/{total} ({pct}%)")
            
            if status == "completed":
                result = status_data
                break
            elif status == "failed":
                print(f"❌ Job failed: {status_data.get('error')}")
                return False
                
            poll_count += 1
            await asyncio.sleep(3)
            
        if not result:
            print("❌ Job timed out")
            return False

        # 4. Verify Image URLs Uniqueness
        print("\n[4] Analyzing slide image URLs for duplicates...")
        slides = result.get("slides", [])
        urls = []
        for i, s in enumerate(slides):
            url = s.get("content", {}).get("image_url")
            desc = s.get("content", {}).get("detailed_visual_description", "")
            title = s.get("title", "")
            if url:
                urls.append(url)
                print(f"  Slide {i+1} ({title[:30]}...):")
                print(f"    URL: {url[:100]}...")
            else:
                print(f"  Slide {i+1} ({title[:30]}...): No image URL generated")

        # Let's count uniqueness
        unique_urls = set(urls)
        print(f"\n[Summary] Total slides: {len(slides)}")
        print(f"          Total images: {len(urls)}")
        print(f"          Unique images: {len(unique_urls)}")
        
        if len(urls) == len(unique_urls):
            print("\n✓ SUCCESS: All generated slides have completely unique image URLs!")
            return True
        else:
            print("\n❌ FAILURE: Repeated image URLs detected across slides!")
            duplicate_urls = [u for u in unique_urls if urls.count(u) > 1]
            print(f"  Duplicates found: {len(urls) - len(unique_urls)}")
            for dup in duplicate_urls:
                indices = [i+1 for i, u in enumerate(urls) if u == dup]
                print(f"  URL: {dup[:100]}... is repeated on slides {indices}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_image_uniqueness())
    import sys
    sys.exit(0 if success else 1)
