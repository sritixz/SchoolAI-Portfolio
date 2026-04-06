"""
Test script for Intervention Alerts endpoints.
Run: python test_interventions.py
Requires backend running on http://localhost:8001
"""
import asyncio
import httpx
import json

BASE = "http://localhost:8001"

# ── helpers ──────────────────────────────────────────────────

def ok(label, condition, detail=""):
    status = "✅ PASS" if condition else "❌ FAIL"
    print(f"  {status}  {label}" + (f"  ({detail})" if detail else ""))
    return condition

async def login(client, email, password):
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

# ── tests ─────────────────────────────────────────────────────

async def test_interventions(token: str):
    print("\n📋  GET /teacher/interventions")
    async with httpx.AsyncClient(base_url=BASE, headers={"Authorization": f"Bearer {token}"}, timeout=30) as c:
        r = await c.get("/teacher/interventions")
        ok("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        ok("Returns a list", isinstance(data, list), f"type={type(data).__name__}")

        if data:
            first = data[0]
            ok("Has _id",          "_id"          in first)
            ok("Has student_name", "student_name" in first)
            ok("Has priority",     "priority"     in first)
            ok("Has message",      "message"      in first)
            ok("Has status",       "status"       in first)
            ok("Has resolved",     "resolved"     in first)
            ok("Has issues list",  isinstance(first.get("issues"), list))
            ok("Has score_history","score_history" in first)
            ok("Has tags list",    isinstance(first.get("tags"), list))
            ok("Priority valid",   first["priority"] in ("urgent", "important", "routine"),
               f"got '{first['priority']}'")
            print(f"\n  Sample intervention:")
            print(f"    student: {first.get('student_name')}")
            print(f"    priority: {first.get('priority')}")
            print(f"    issues: {first.get('issues')}")
            print(f"    score_history: {first.get('score_history')}")
        else:
            print("  ⚠️  No interventions found — seed data may be missing")

        return data


async def test_intervention_stats(token: str):
    print("\n📊  GET /teacher/interventions/stats")
    async with httpx.AsyncClient(base_url=BASE, headers={"Authorization": f"Bearer {token}"}, timeout=30) as c:
        r = await c.get("/teacher/interventions/stats")
        ok("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        ok("Has students_at_risk",     "students_at_risk"     in data)
        ok("Has repeat_offenders",     "repeat_offenders"     in data)
        ok("Has parent_contact_needed","parent_contact_needed" in data)
        ok("Has actions_pending",      "actions_pending"      in data)
        ok("All values are ints",
           all(isinstance(data.get(k), int) for k in
               ["students_at_risk","repeat_offenders","parent_contact_needed","actions_pending"]))
        print(f"\n  Stats: {json.dumps(data, indent=4)}")
        return data


async def test_intervention_crud(token: str, interventions: list):
    if not interventions:
        print("\n⚠️  Skipping CRUD tests — no interventions to test against")
        return

    # Only test CRUD on real ObjectId-based docs (not auto-generated)
    real = [i for i in interventions if not str(i["_id"]).startswith("auto-")]
    if not real:
        print("\n⚠️  Skipping CRUD tests — only auto-generated interventions found (no stored _id)")
        return

    iid = real[0]["_id"]
    print(f"\n🔧  CRUD tests on intervention {iid}")

    async with httpx.AsyncClient(base_url=BASE, headers={"Authorization": f"Bearer {token}"}, timeout=30) as c:

        # Status update
        r = await c.patch(f"/teacher/interventions/{iid}/status", params={"status": "In Progress"})
        ok("PATCH status → 200", r.status_code == 200, f"got {r.status_code}")

        # Review
        r = await c.patch(f"/teacher/interventions/{iid}/review")
        ok("PATCH review → 200", r.status_code == 200, f"got {r.status_code}")

        # Notes
        r = await c.patch(f"/teacher/interventions/{iid}/notes", json={"note": "Test note from automated test"})
        ok("PATCH notes → 200", r.status_code == 200, f"got {r.status_code}")

        # Snooze
        r = await c.patch(f"/teacher/interventions/{iid}/snooze")
        ok("PATCH snooze → 200", r.status_code == 200, f"got {r.status_code}")


async def test_auth_required():
    print("\n🔒  Auth guard tests")
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        r = await c.get("/teacher/interventions")
        ok("No token → 401/403", r.status_code in (401, 403), f"got {r.status_code}")

        r = await c.get("/teacher/interventions/stats")
        ok("No token → 401/403", r.status_code in (401, 403), f"got {r.status_code}")


async def main():
    print("=" * 55)
    print("  Intervention Alerts — Backend Test Suite")
    print("=" * 55)

    # Try to login as teacher
    try:
        async with httpx.AsyncClient(base_url=BASE, timeout=15) as c:
            # Login requires email + password + role
            for email, pwd in [
                ("john.doe@school.com",     "teacher123"),
                ("jane.smith@school.com",   "teacher123"),
                ("john.doe@vinschool.com",  "teacher123"),
                ("teacher@vinschool.com",   "teacher123"),
            ]:
                try:
                    r = await c.post("/auth/login", json={"email": email, "password": pwd, "role": "teacher"})
                    if r.status_code == 200:
                        token = r.json()["access_token"]
                        print(f"\n✅  Logged in as {email}")
                        break
                except Exception:
                    continue
            else:
                print("\n❌  Could not login — check credentials in seed data")
                print("    Try: python seed_extended.py  then re-run this test")
                return
    except httpx.ConnectError:
        print(f"\n❌  Cannot connect to {BASE}")
        print("    Make sure the backend is running: uvicorn main:app --reload --port 8001")
        return

    await test_auth_required()
    interventions = await test_interventions(token)
    await test_intervention_stats(token)
    await test_intervention_crud(token, interventions)

    print("\n" + "=" * 55)
    print("  Tests complete")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(main())
