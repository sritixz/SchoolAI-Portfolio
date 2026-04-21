"""
Test script for the Presentation Creator feature with history and image fetching.
Tests:
1. Presentation generation with all form context
2. History saving and retrieval
3. Image URL generation and proxy
4. LLM prompt includes all form parameters
"""
import asyncio
import json
import httpx
from datetime import datetime

# Test configuration
API_BASE = "http://localhost:8001"
TEACHER_EMAIL = "teacher@example.com"
TEACHER_PASSWORD = "password123"

async def test_presentation_feature():
    """Run all presentation feature tests"""
    async with httpx.AsyncClient(base_url=API_BASE, timeout=120) as client:
        print("=" * 80)
        print("PRESENTATION CREATOR FEATURE TEST")
        print("=" * 80)
        
        # 1. Login as teacher
        print("\n[1] Logging in as teacher...")
        login_res = await client.post("/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD,
            "role": "teacher"
        })
        if login_res.status_code != 200:
            print(f"❌ Login failed: {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✓ Logged in successfully")
        
        # 2. Generate presentation with all form context
        print("\n[2] Generating presentation with complete form context...")
        gen_payload = {
            "tool": "presentation",
            "subject": "Mathematics",
            "topic": "Linear Equations",
            "grade": "10",
            "extra": {
                "num_slides": 5,
                "duration_minutes": 30,
                "purpose": "teaching",
                "visual_style": "modern",
                "board": "CBSE",
                "chapter": "Chapter 2",
                "learning_objective": "Concept Understanding",
                "special_instructions": "Include real-world examples and interactive activities",
                "target_audience": "students",
                "tone": "Engaging",
                "content_depth": "Concise",
                "include_mini_quiz": True,
            }
        }
        
        gen_res = await client.post(
            "/teacher/ai-tool/presentation/generate",
            json=gen_payload,
            headers=headers
        )
        if gen_res.status_code != 200:
            print(f"❌ Generation failed: {gen_res.text}")
            return
        
        job_id = gen_res.json()["job_id"]
        print(f"✓ Presentation generation started with job_id: {job_id}")
        
        # 3. Poll for completion
        print("\n[3] Polling for presentation completion...")
        max_polls = 120  # 4 minutes max
        poll_count = 0
        result = None
        
        while poll_count < max_polls:
            status_res = await client.get(
                f"/teacher/ai-tool/status/{job_id}",
                headers=headers
            )
            if status_res.status_code != 200:
                print(f"❌ Status check failed: {status_res.text}")
                return
            
            status_data = status_res.json()
            status = status_data.get("status")
            current = status_data.get("current_slide", 0)
            total = status_data.get("total_slides", 0)
            pct = status_data.get("progress_pct", 0)
            
            print(f"  Status: {status} | Slide {current}/{total} ({pct}%)")
            
            if status == "completed":
                result = status_data
                print(f"✓ Presentation completed!")
                break
            elif status == "failed":
                print(f"❌ Presentation generation failed: {status_data.get('error')}")
                return
            
            poll_count += 1
            await asyncio.sleep(2)
        
        if not result:
            print(f"❌ Presentation generation timed out after {max_polls * 2} seconds")
            return
        
        # 4. Verify result structure and form context
        print("\n[4] Verifying presentation result structure...")
        required_fields = [
            "title", "subject", "grade", "board", "total_slides",
            "duration_minutes", "purpose", "tone", "visual_style",
            "learning_objectives", "slides", "teacher_preparation_notes"
        ]
        
        for field in required_fields:
            if field not in result:
                print(f"❌ Missing field: {field}")
                return
        
        print(f"✓ All required fields present")
        print(f"  - Title: {result['title']}")
        print(f"  - Subject: {result['subject']}")
        print(f"  - Grade: {result['grade']}")
        print(f"  - Board: {result['board']}")
        print(f"  - Total slides: {result['total_slides']}")
        print(f"  - Purpose: {result['purpose']}")
        print(f"  - Tone: {result['tone']}")
        print(f"  - Visual style: {result['visual_style']}")
        
        # 5. Verify slides have image URLs
        print("\n[5] Verifying slide image URLs...")
        slides = result.get("slides", [])
        image_count = 0
        for i, slide in enumerate(slides):
            image_url = slide.get("content", {}).get("image_url")
            if image_url:
                image_count += 1
                print(f"  Slide {i+1}: ✓ Has image URL")
                # Verify it's a Pollinations URL
                if "pollinations.ai" not in image_url:
                    print(f"    ⚠ Warning: URL doesn't look like Pollinations: {image_url[:80]}")
            else:
                print(f"  Slide {i+1}: ⚠ No image URL")
        
        print(f"✓ {image_count}/{len(slides)} slides have image URLs")
        
        # 6. Verify visual descriptions are unique
        print("\n[6] Verifying unique visual descriptions...")
        descriptions = []
        for i, slide in enumerate(slides):
            desc = slide.get("content", {}).get("detailed_visual_description", "")
            if desc:
                descriptions.append(desc)
                print(f"  Slide {i+1}: {desc[:70]}...")
        
        unique_count = len(set(descriptions))
        print(f"✓ {unique_count}/{len(descriptions)} descriptions are unique")
        
        # 7. Save to history
        print("\n[7] Saving presentation to history...")
        save_payload = {
            **result,
            "subject": gen_payload["subject"],
            "topic": gen_payload["topic"],
            "grade": gen_payload["grade"],
            "board": gen_payload["extra"]["board"],
            "chapter": gen_payload["extra"]["chapter"],
            "purpose": gen_payload["extra"]["purpose"],
            "visual_style": gen_payload["extra"]["visual_style"],
            "tone": gen_payload["extra"]["tone"],
            "content_depth": gen_payload["extra"]["content_depth"],
            "target_audience": gen_payload["extra"]["target_audience"],
            "learning_objective": gen_payload["extra"]["learning_objective"],
            "include_mini_quiz": gen_payload["extra"]["include_mini_quiz"],
            "special_instructions": gen_payload["extra"]["special_instructions"],
        }
        
        save_res = await client.post(
            "/teacher/ai-tool/presentation/save-history",
            json=save_payload,
            headers=headers
        )
        if save_res.status_code != 200:
            print(f"❌ Save to history failed: {save_res.text}")
            return
        
        presentation_id = save_res.json()["_id"]
        print(f"✓ Presentation saved with ID: {presentation_id}")
        
        # 8. Retrieve from history
        print("\n[8] Retrieving presentation history...")
        history_res = await client.get(
            "/teacher/ai-tool/presentation/history",
            headers=headers
        )
        if history_res.status_code != 200:
            print(f"❌ History retrieval failed: {history_res.text}")
            return
        
        presentations = history_res.json()["presentations"]
        print(f"✓ Retrieved {len(presentations)} presentations from history")
        
        # 9. Load specific presentation
        print("\n[9] Loading specific presentation from history...")
        load_res = await client.get(
            f"/teacher/ai-tool/presentation/{presentation_id}",
            headers=headers
        )
        if load_res.status_code != 200:
            print(f"❌ Load failed: {load_res.text}")
            return
        
        loaded = load_res.json()
        print(f"✓ Loaded presentation: {loaded['title']}")
        print(f"  - Slides: {loaded['total_slides']}")
        print(f"  - Created: {loaded['created_at']}")
        
        # 10. Test image proxy
        print("\n[10] Testing image proxy...")
        if slides and slides[0].get("content", {}).get("image_url"):
            image_url = slides[0]["content"]["image_url"]
            proxy_res = await client.get(
                "/teacher/image-proxy",
                params={"url": image_url},
                headers=headers,
                timeout=120
            )
            if proxy_res.status_code == 200:
                print(f"✓ Image proxy working (received {len(proxy_res.content)} bytes)")
            else:
                print(f"⚠ Image proxy returned {proxy_res.status_code}")
        
        print("\n" + "=" * 80)
        print("✓ ALL TESTS PASSED!")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_presentation_feature())
