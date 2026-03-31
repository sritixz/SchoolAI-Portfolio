"""
Role Verification Script
Verifies every seeded role's API endpoints end-to-end.

Usage:
    python verify_roles.py

Requires the backend to be running:
    uvicorn main:app --reload --port 8001
"""
import asyncio
import httpx
import json
import sys

BASE = "http://localhost:8001"

# ── Colours ──────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

passed = 0
failed = 0
skipped = 0

def ok(label: str, detail: str = ""):
    global passed
    passed += 1
    print(f"  {GREEN}✓{RESET} {label}" + (f"  {YELLOW}({detail}){RESET}" if detail else ""))

def fail(label: str, detail: str = ""):
    global failed
    failed += 1
    print(f"  {RED}✗{RESET} {label}" + (f"  {RED}→ {detail}{RESET}" if detail else ""))

def skip(label: str, reason: str = ""):
    global skipped
    skipped += 1
    print(f"  {YELLOW}~{RESET} {label}" + (f"  {YELLOW}(skipped: {reason}){RESET}" if reason else ""))

def section(title: str):
    print(f"\n{BOLD}{CYAN}{'─'*55}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*55}{RESET}")

def check(condition: bool, label: str, detail: str = ""):
    if condition:
        ok(label, detail)
    else:
        fail(label, detail)

# ── Auth helpers ─────────────────────────────────────────────

async def email_login(client: httpx.AsyncClient, email: str, password: str, role: str) -> str | None:
    r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password, "role": role})
    if r.status_code == 200:
        token = r.json().get("access_token")
        ok(f"Login [{role}] {email}", f"token …{token[-8:]}")
        return token
    fail(f"Login [{role}] {email}", f"HTTP {r.status_code} — {r.text[:120]}")
    return None

async def student_login(client: httpx.AsyncClient, phone: str) -> str | None:
    # Step 1: request OTP
    r1 = await client.post(f"{BASE}/auth/otp/request", json={"phone": phone, "role": "student"})
    if r1.status_code != 200:
        fail(f"OTP request [{phone}]", f"HTTP {r1.status_code} — {r1.text[:120]}")
        return None
    otp = r1.json().get("dev_otp")
    if not otp:
        fail(f"OTP request [{phone}]", "dev_otp not returned — check DEBUG=true in .env")
        return None
    # Step 2: verify OTP
    r2 = await client.post(f"{BASE}/auth/otp/verify", json={"phone": phone, "otp": otp, "role": "student"})
    if r2.status_code == 200:
        token = r2.json().get("access_token")
        ok(f"OTP login [student] {phone}", f"token …{token[-8:]}")
        return token
    fail(f"OTP verify [{phone}]", f"HTTP {r2.status_code} — {r2.text[:120]}")
    return None

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

async def get(client, url, token, label, expect_key=None, min_len=None):
    r = await client.get(url, headers=auth_headers(token))
    if r.status_code != 200:
        fail(label, f"HTTP {r.status_code}")
        return None
    data = r.json()
    if expect_key and isinstance(data, dict):
        if expect_key not in data:
            fail(label, f"missing key '{expect_key}'")
            return data
    if min_len is not None and isinstance(data, list):
        if len(data) < min_len:
            fail(label, f"expected ≥{min_len} items, got {len(data)}")
            return data
    detail = ""
    if isinstance(data, list):
        detail = f"{len(data)} items"
    elif isinstance(data, dict) and expect_key:
        val = data.get(expect_key)
        detail = f"{expect_key}={repr(val)[:40]}"
    ok(label, detail)
    return data

# ═══════════════════════════════════════════════════════════════
# SCHOOL ADMIN
# ═══════════════════════════════════════════════════════════════

async def verify_school_admin(client: httpx.AsyncClient):
    section("SCHOOL ADMIN  (admin@school.com / admin123)")
    token = await email_login(client, "admin@school.com", "admin123", "schooladmin")
    if not token:
        skip("All school admin checks", "login failed")
        return

    await get(client, f"{BASE}/schooladmin/dashboard",          token, "Dashboard")
    await get(client, f"{BASE}/schooladmin/grades",             token, "Grades list",             min_len=2)
    await get(client, f"{BASE}/schooladmin/sections",           token, "Sections list",           min_len=3)
    await get(client, f"{BASE}/schooladmin/teachers",           token, "Teachers list",           min_len=3)
    await get(client, f"{BASE}/schooladmin/students",           token, "Students list",           min_len=7)
    await get(client, f"{BASE}/schooladmin/parents",            token, "Parents list",            min_len=3)
    await get(client, f"{BASE}/schooladmin/performance-matrix", token, "Performance matrix",      min_len=1)
    await get(client, f"{BASE}/schooladmin/gap-heatmap",        token, "Gap heatmap",             min_len=1)
    await get(client, f"{BASE}/schooladmin/cross-class",        token, "Cross-class analytics",  min_len=1)
    await get(client, f"{BASE}/schooladmin/curriculum-tracker", token, "Curriculum tracker",     min_len=1)
    await get(client, f"{BASE}/schooladmin/weak-topics",        token, "Weak topics (pipeline)")
    await get(client, f"{BASE}/schooladmin/teacher-support",    token, "Teacher support data",   min_len=1)
    await get(client, f"{BASE}/schooladmin/audit-logs",         token, "Audit logs")

# ═══════════════════════════════════════════════════════════════
# TEACHER
# ═══════════════════════════════════════════════════════════════

async def verify_teacher(client: httpx.AsyncClient):
    section("TEACHER  (john.doe@school.com / teacher123)")
    token = await email_login(client, "john.doe@school.com", "teacher123", "teacher")
    if not token:
        skip("All teacher checks", "login failed")
        return

    # Dashboard / profile
    me = await get(client, f"{BASE}/auth/me", token, "Auth /me", expect_key="role")

    # Homework management
    hw_list = await get(client, f"{BASE}/homework/library", token, "Teacher homework library")
    hw_id = None
    if hw_list and len(hw_list) > 0:
        hw_id = hw_list[0].get("_id")
        ok("Homework ID extracted", hw_id)

    if hw_id:
        await get(client, f"{BASE}/teacher/evaluate/{hw_id}", token, f"Evaluate homework {hw_id[:8]}…")
        await get(client, f"{BASE}/homework/{hw_id}/submissions", token, f"Submissions for hw {hw_id[:8]}…")

    # Parent communication
    await get(client, f"{BASE}/teacher/parent-communication", token, "Parent communication history")

    # Teacher sections — teachers access their own sections via homework, not admin endpoint
    r_sec = await client.get(f"{BASE}/schooladmin/sections", headers=auth_headers(token))
    check(r_sec.status_code == 403, "Teacher correctly blocked from admin sections endpoint", f"HTTP {r_sec.status_code}")

    # Second teacher
    section("TEACHER  (jane.smith@school.com / teacher123)")
    token2 = await email_login(client, "jane.smith@school.com", "teacher123", "teacher")
    if token2:
        await get(client, f"{BASE}/homework/library", token2, "Jane's homework library")
        await get(client, f"{BASE}/teacher/parent-communication", token2, "Jane's parent comms")

# ═══════════════════════════════════════════════════════════════
# STUDENT
# ═══════════════════════════════════════════════════════════════

async def verify_student(client: httpx.AsyncClient):
    section("STUDENT  (Alice Johnson — phone 1111111111)")
    token = await student_login(client, "1111111111")
    if not token:
        skip("All student checks", "login failed")
        return

    me = await get(client, f"{BASE}/auth/me", token, "Auth /me", expect_key="name")

    # Homework list
    hw_list = await get(client, f"{BASE}/homework/student", token, "Student homework list")
    hw_id = None
    if hw_list and len(hw_list) > 0:
        hw_id = hw_list[0].get("_id")
        ok("Homework ID extracted", hw_id)

    if hw_id:
        questions = await get(client, f"{BASE}/homework/{hw_id}/questions", token, f"Questions for hw {hw_id[:8]}…")
        if questions and len(questions) > 0:
            ok("Questions returned", f"{len(questions)} questions")

    # Learning gaps
    await get(client, f"{BASE}/learning-gaps/", token, "Learning gaps")
    await get(client, f"{BASE}/learning-gaps/health", token, "Learning gaps health", expect_key="score")

    # Student profile
    await get(client, f"{BASE}/student/profile", token, "Student profile", expect_key="name")
    await get(client, f"{BASE}/student/mastery", token, "Student mastery")

    # Second student (Kevin Lee — Grade 7-A)
    section("STUDENT  (Kevin Lee — phone 1010101010)")
    token2 = await student_login(client, "1010101010")
    if token2:
        await get(client, f"{BASE}/homework/student", token2, "Kevin's homework list")
        await get(client, f"{BASE}/auth/me", token2, "Kevin /me", expect_key="name")

# ═══════════════════════════════════════════════════════════════
# PARENT
# ═══════════════════════════════════════════════════════════════

async def verify_parent(client: httpx.AsyncClient):
    section("PARENT  (bob.johnson@parent.com / parent123)")
    token = await email_login(client, "bob.johnson@parent.com", "parent123", "parent")
    if not token:
        skip("All parent checks", "login failed")
        return

    # Dashboard — must return children list
    dash = await get(client, f"{BASE}/parent/dashboard", token, "Parent dashboard", expect_key="children")
    child_id = None
    if dash and dash.get("children"):
        child_id = dash["children"][0].get("_id")
        ok("Child ID extracted", f"{dash['children'][0].get('name')} → {child_id}")

    if child_id:
        await get(client, f"{BASE}/parent/homework-overview?child_id={child_id}", token, "Homework overview")
        await get(client, f"{BASE}/parent/consistency?child_id={child_id}",       token, "Consistency data",    expect_key="score")
        await get(client, f"{BASE}/parent/topic-progress?child_id={child_id}",    token, "Topic progress",      min_len=1)
        await get(client, f"{BASE}/parent/support-alerts?child_id={child_id}",    token, "Support alerts",      min_len=1)
        await get(client, f"{BASE}/parent/growth-portfolio?child_id={child_id}",  token, "Growth portfolio",    min_len=1)
        await get(client, f"{BASE}/parent/learning-profile?child_id={child_id}",  token, "Learning profile",    expect_key="learningStyle")
    else:
        skip("Child-specific endpoints", "no child_id from dashboard")

    await get(client, f"{BASE}/parent/notifications", token, "Notifications", min_len=1)

    # Diana Brown has 3 children — verify multi-child
    section("PARENT  (diana.brown@parent.com / parent123)  [3 children]")
    token2 = await email_login(client, "diana.brown@parent.com", "parent123", "parent")
    if token2:
        dash2 = await get(client, f"{BASE}/parent/dashboard", token2, "Diana's dashboard", expect_key="children")
        if dash2:
            child_count = len(dash2.get("children", []))
            check(child_count == 3, f"Diana has 3 children", f"got {child_count}")
            if child_count > 0:
                cid2 = dash2["children"][0].get("_id")
                await get(client, f"{BASE}/parent/topic-progress?child_id={cid2}", token2, f"Topic progress for child 1")
                await get(client, f"{BASE}/parent/notifications", token2, "Diana's notifications", min_len=1)

# ═══════════════════════════════════════════════════════════════
# CROSS-ROLE CHECKS
# ═══════════════════════════════════════════════════════════════

async def verify_cross_role(client: httpx.AsyncClient):
    section("CROSS-ROLE SECURITY CHECKS")

    # Student token should NOT access teacher endpoints
    student_token = await student_login(client, "3333333333")
    if student_token:
        r = await client.get(f"{BASE}/teacher/evaluate/fakeid", headers=auth_headers(student_token))
        check(r.status_code in (401, 403, 404), "Student blocked from teacher evaluate endpoint", f"HTTP {r.status_code}")

        r2 = await client.get(f"{BASE}/schooladmin/dashboard", headers=auth_headers(student_token))
        check(r2.status_code in (401, 403), "Student blocked from admin dashboard", f"HTTP {r2.status_code}")

    # Parent token should NOT access admin endpoints
    parent_token = await email_login(client, "frank.wilson@parent.com", "parent123", "parent")
    if parent_token:
        r3 = await client.get(f"{BASE}/schooladmin/teachers", headers=auth_headers(parent_token))
        check(r3.status_code in (401, 403), "Parent blocked from admin teachers list", f"HTTP {r3.status_code}")

    # Invalid credentials
    r4 = await client.post(f"{BASE}/auth/login", json={"email": "admin@school.com", "password": "wrongpass", "role": "schooladmin"})
    check(r4.status_code == 401, "Invalid password rejected", f"HTTP {r4.status_code}")

    r5 = await client.post(f"{BASE}/auth/otp/request", json={"phone": "0000000000", "role": "student"})
    check(r5.status_code == 404, "Unknown phone rejected", f"HTTP {r5.status_code}")

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

async def main():
    print(f"\n{BOLD}{'═'*55}{RESET}")
    print(f"{BOLD}  BAWAN PLATFORM — ROLE VERIFICATION SUITE{RESET}")
    print(f"{BOLD}  Target: {BASE}{RESET}")
    print(f"{BOLD}{'═'*55}{RESET}")

    # Check server is up
    try:
        async with httpx.AsyncClient(timeout=5) as probe:
            r = await probe.get(f"{BASE}/docs")
            if r.status_code not in (200, 404):
                raise ConnectionError()
    except Exception:
        print(f"\n{RED}  ERROR: Cannot reach {BASE}{RESET}")
        print(f"  Make sure the backend is running:")
        print(f"  {YELLOW}  uvicorn main:app --reload --port 8001{RESET}\n")
        sys.exit(1)

    async with httpx.AsyncClient(timeout=15) as client:
        await verify_school_admin(client)
        await verify_teacher(client)
        await verify_student(client)
        await verify_parent(client)
        await verify_cross_role(client)

    # ── Summary ──────────────────────────────────────────────
    total = passed + failed + skipped
    print(f"\n{BOLD}{'═'*55}{RESET}")
    print(f"{BOLD}  RESULTS{RESET}")
    print(f"{BOLD}{'═'*55}{RESET}")
    print(f"  {GREEN}Passed : {passed}{RESET}")
    print(f"  {RED}Failed : {failed}{RESET}")
    print(f"  {YELLOW}Skipped: {skipped}{RESET}")
    print(f"  Total  : {total}")

    if failed == 0:
        print(f"\n  {GREEN}{BOLD}All checks passed! 🎉{RESET}\n")
    else:
        print(f"\n  {RED}{BOLD}{failed} check(s) failed. See above for details.{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
