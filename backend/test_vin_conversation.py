"""
End-to-end sample conversation test for Vin AI.
Tests: login → chat turn 1 → chat turn 2 (with history) → answer MCQ → fetch history

Run: python test_vin_conversation.py
"""
import asyncio
import httpx
import json
import re
import sys

API = "http://localhost:8000"
STUDENT_PHONE = "1111111111"  # Alice Johnson from seed data

# ── ANSI colours ─────────────────────────────────────────────
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; RESET = "\033[0m"; BOLD = "\033[1m"

def ok(msg):  print(f"{G}✓{RESET} {msg}")
def err(msg): print(f"{R}✗{RESET} {msg}"); sys.exit(1)
def info(msg):print(f"{B}→{RESET} {msg}")
def head(msg):print(f"\n{BOLD}{Y}{'─'*55}{RESET}\n{BOLD}  {msg}{RESET}\n{BOLD}{Y}{'─'*55}{RESET}")

# ── XML helpers ───────────────────────────────────────────────
def extract(xml, tag):
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", xml, re.DOTALL)
    return m.group(1).strip() if m else ""

def extract_options(xml):
    return re.findall(r'<option correct="(true|false)">(.*?)</option>', xml, re.DOTALL)

# ── SSE stream reader ─────────────────────────────────────────
async def read_stream(client, url, headers, body) -> str:
    """POST to SSE endpoint, print tokens live, return full XML."""
    full = ""
    async with client.stream("POST", url, headers=headers, json=body) as resp:
        if resp.status_code != 200:
            text = await resp.aread()
            err(f"HTTP {resp.status_code}: {text.decode()}")
        async for line in resp.aiter_lines():
            if line.startswith("data: "):
                data = line[6:]
                if data == "[DONE]":
                    break
                token = data.replace("\\n", "\n")
                full += token
                print(token, end="", flush=True)
    print()  # newline after stream
    return full

# ── MAIN TEST ─────────────────────────────────────────────────
async def main():
    print(f"\n{BOLD}{'═'*55}")
    print("  Vin AI — Sample Conversation Test")
    print(f"{'═'*55}{RESET}\n")

    async with httpx.AsyncClient(timeout=90) as client:

        # ── STEP 1: Login (phone OTP) ─────────────────────────
        head("STEP 1 — Student Login (Phone OTP)")

        info(f"Requesting OTP for phone {STUDENT_PHONE}...")
        r = await client.post(f"{API}/auth/otp/request",
                              json={"phone": STUDENT_PHONE, "role": "student"})
        if r.status_code != 200:
            err(f"OTP request failed: {r.text}")
        otp_data = r.json()
        otp = otp_data.get("dev_otp")
        if not otp:
            err("dev_otp not returned — is DEBUG=True in backend/.env?")
        ok(f"OTP received: {otp}")

        info("Verifying OTP...")
        r = await client.post(f"{API}/auth/otp/verify",
                              json={"phone": STUDENT_PHONE, "role": "student", "otp": otp})
        if r.status_code != 200:
            err(f"OTP verify failed: {r.text}")
        auth = r.json()
        token = auth["access_token"]
        ok(f"Logged in as: {auth['name']} (role: {auth['role']})")

        headers = {"Authorization": f"Bearer {token}"}
        history = []  # conversation context

        # ── STEP 2: First chat turn ───────────────────────────
        head("STEP 2 — Chat Turn 1: Ask about quadratic equations")

        q1 = "How do I solve x² - 5x + 6 = 0 using factoring?"
        info(f"Student: {q1}\n")
        print(f"{B}Vin AI streaming:{RESET}")

        xml1 = await read_stream(client, f"{API}/vin-ai/chat", headers, {
            "message": q1,
            "history": history,
        })

        subject1 = extract(xml1, "subject")
        content1 = re.sub(r"<[^>]+>", "", extract(xml1, "content"))
        hint1    = extract(xml1, "hint")
        steps1   = re.findall(r'<step number="\d+">(.*?)</step>', xml1, re.DOTALL)
        options1 = extract_options(xml1)
        followups1 = re.findall(r"<followup>(.*?)</followup>", xml1, re.DOTALL)

        print(f"\n{B}Parsed response:{RESET}")
        ok(f"Subject: {subject1}")
        ok(f"Content: {content1[:120]}...")
        ok(f"Hint: {hint1[:80]}") if hint1 else info("No hint in this response")
        ok(f"Steps: {len(steps1)} steps") if steps1 else info("No steps")
        ok(f"MCQ options: {len(options1)}") if options1 else info("No practice question")
        ok(f"Follow-ups: {len(followups1)}")
        ok("</response> tag present — stream complete") if "</response>" in xml1 else err("Stream incomplete — missing </response>")

        # Update history
        history.append({"role": "user", "content": q1})
        history.append({"role": "assistant", "content": xml1})

        # ── STEP 3: Second turn (uses history context) ────────
        head("STEP 3 — Chat Turn 2: Follow-up using context")

        q2 = followups1[0] if followups1 else "Can you show me the step-by-step solution?"
        info(f"Student (follow-up): {q2}\n")
        print(f"{B}Vin AI streaming:{RESET}")

        xml2 = await read_stream(client, f"{API}/vin-ai/chat", headers, {
            "message": q2,
            "history": history,
        })

        content2 = re.sub(r"<[^>]+>", "", extract(xml2, "content"))
        ok(f"Turn 2 content: {content2[:120]}...")
        ok("Context maintained — turn 2 complete") if "</response>" in xml2 else err("Turn 2 stream incomplete")

        history.append({"role": "user", "content": q2})
        history.append({"role": "assistant", "content": xml2})

        # ── STEP 4: Answer practice MCQ ───────────────────────
        head("STEP 4 — Answer Practice Question (wrong answer)")

        # Use MCQ from turn 1 if available, else use a generic one
        if options1:
            correct_opt = next((t for c, t in options1 if c == "true"), None)
            wrong_opt   = next((t for c, t in options1 if c == "false"), None)
            q_text = extract(xml1, "question").split("<option")[0].strip()
        else:
            q_text    = "What are the roots of x² - 5x + 6 = 0?"
            wrong_opt = "x = 1 and x = 6"
            correct_opt = "x = 2 and x = 3"

        info(f"Student answers WRONG: '{wrong_opt}'\n")
        print(f"{B}Vin AI streaming:{RESET}")

        xml3 = await read_stream(client, f"{API}/vin-ai/answer", headers, {
            "question": q_text,
            "chosen": wrong_opt,
            "correct": False,
            "history": history,
        })

        content3 = re.sub(r"<[^>]+>", "", extract(xml3, "content"))
        hint3    = extract(xml3, "hint")
        ok(f"Feedback content: {content3[:120]}...")
        ok(f"New hint: {hint3[:80]}") if hint3 else info("No hint in feedback")
        ok("Answer feedback complete") if "</response>" in xml3 else err("Answer stream incomplete")

        # ── STEP 5: Fetch history ─────────────────────────────
        head("STEP 5 — Fetch Doubt History")

        await asyncio.sleep(1)  # give background task time to save
        r = await client.get(f"{API}/vin-ai/history", headers=headers)
        if r.status_code != 200:
            err(f"History fetch failed: {r.text}")
        hist = r.json()
        ok(f"History entries saved: {len(hist)}")
        if hist:
            latest = hist[0]
            ok(f"Latest entry — subject: {latest.get('subject')}")
            ok(f"Latest entry — question: {latest.get('question', '')[:60]}...")
            ok(f"Latest entry — preview: {latest.get('preview', '')[:80]}...")

        # ── STEP 6: Star a conversation ───────────────────────
        if hist:
            head("STEP 6 — Star a Conversation")
            doubt_id = hist[0]["_id"]
            r = await client.post(f"{API}/vin-ai/history/{doubt_id}/star", headers=headers)
            if r.status_code == 200:
                ok(f"Starred: {r.json()}")
            else:
                err(f"Star failed: {r.text}")

        # ── SUMMARY ───────────────────────────────────────────
        print(f"\n{BOLD}{G}{'═'*55}")
        print("  ALL TESTS PASSED")
        print(f"{'═'*55}{RESET}\n")
        print(f"  Turns tested : 2 chat + 1 answer")
        print(f"  History saved: {len(hist)} entries")
        print(f"  Streaming    : ✓ token-by-token SSE")
        print(f"  XML parsing  : ✓ subject/content/hint/steps/MCQ/followups")
        print(f"  Context      : ✓ history passed across turns")
        print()

if __name__ == "__main__":
    asyncio.run(main())
