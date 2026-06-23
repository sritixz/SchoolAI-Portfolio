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
    Falls back to a high-fidelity local mock stream if OpenRouter keys are invalid.
    """
    import json as _json
    import re
    import asyncio
    
    vin_model = model or getattr(settings, "VIN_MODEL", None) or settings.OPENROUTER_MODEL
    user_msg = ""
    if messages:
        user_msg = messages[-1].get("content", "").lower()
        
    try:
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
    except Exception as e:
        print(f"[FALLBACK] OpenRouter streaming failed ({e}). Attempting mock streaming for: '{user_msg}'")
        
        # Determine the best mock response content based on query keywords
        if "integer" in user_msg:
            mock_resp = """<response><subject>Teaching Integers (Class 6)</subject><content>To introduce <b>integers</b> to Class 6, begin with a relatable analogy: <b>sea level</b> or a <b>thermometer</b>. Explain that integers include all whole numbers: positive, negative, and zero. For example, negative numbers represent heights below sea level (-5m) or temperatures below freezing (-3 degrees). Using a <b>number line</b> is highly recommended to visually demonstrate operations.</content><hint>Teaching Tip: Use floor tape to create a number line in the classroom and have students physically walk forward (addition) or backward (subtraction).</hint><steps><step number="1">Introduce the concept of positive and negative using temperature/elevations.</step><step number="2">Draw a number line on the board and label zero as the neutral point.</step><step number="3">Practice walking on the number line: start at 2, move 3 steps left to reach -1.</step></steps><question>Which of the following numbers is the smallest?<option correct="false">-2</option><option correct="true">-5</option><option correct="false">0</option><option correct="false">1</option></question><media_query>Class 6 Integers number line</media_query><followups><followup>How to teach integer addition rules?</followup><followup>Show worksheets for negative numbers</followup></followups></response>"""
        elif "lesson plan" in user_msg:
            mock_resp = """<response><subject>Lesson Plan: Introduction to Photosynthesis</subject><content>This is a <b>45-minute lesson plan</b> designed to introduce <b>photosynthesis</b> to Grade 7 students. The main objective is to identify the raw materials and products of photosynthesis.<br><b>Materials needed:</b> A green potted plant, iodine solution, water, and sunlight access.<br><b>Hook:</b> Ask students where plants get their food if they can't walk to a grocery store!</content><hint>Teaching Tip: Emphasize that "photo" means light, and "synthesis" means putting together. Plants assemble food using light!</hint><steps><step number="1">Engage (5 mins): Ask the Hook question and discuss plant survival.</step><step number="2">Explore (15 mins): Discuss the chemical equation of photosynthesis using board diagrams.</step><step number="3">Explain (15 mins): Detail the role of chlorophyll, carbon dioxide, and sunlight.</step><step number="4">Evaluate (10 mins): Exit ticket quiz on raw materials vs. products.</step></steps><question>What is the primary byproduct of photosynthesis released into the air?<option correct="false">Carbon Dioxide</option><option correct="true">Oxygen</option><option correct="false">Glucose</option><option correct="false">Water</option></question><media_query>Photosynthesis diagram for kids</media_query><followups><followup>Suggest worksheets on leaf cross-section</followup><followup>Give homework ideas for photosynthesis</followup></followups></response>"""
        elif "email" in user_msg or "parent" in user_msg:
            mock_resp = """<response><subject>Parent Email Draft: Progress Update</subject><content>Dear Parent,<br><br>I hope you are doing well. I wanted to share a quick update regarding your child's progress in <b>Mathematics</b>.<br><br>Over the last few weeks, we have been focusing on <b>algebraic equations</b>. While they initially found the concept challenging, I have noticed a positive change in their class participation and homework submissions. They are showing a much better understanding of the step-by-step working.<br><br>To help reinforce this at home, I recommend practicing 5 equations every weekend. Please let me know if you would like extra practice worksheets.<br><br>Best regards,<br>[Teacher's Name]</content><hint>Teaching Tip: Always start parent communication with a positive observation before discussing areas of improvement.</hint><steps><step number="1">Start with a warm greeting and positive observation.</step><step number="2">State the specific academic topic and progress details.</step><step number="3">Provide actionable recommendations for home support.</step></steps><question>Which tone is most appropriate for discussing a student's weak areas with parents?<option correct="false">Strict and directive</option><option correct="true">Collaborative and encouraging</option><option correct="false">Vague and generic</option></question><media_query>Professional parent teacher communication</media_query><followups><followup>Draft an email for a student missing homework</followup><followup>Suggest meeting requests template</followup></followups></response>"""
        else:
            mock_resp = """<response><subject>Teacher AI Assistant Support</subject><content>I am here to help you with all your <b>teaching</b> and <b>planning</b> activities!<br>Whether you need to draft <b>lesson plans</b>, formulate <b>worksheets</b>, write professional <b>emails to parents</b>, or brainstorm creative <b>classroom games</b>, simply ask me.<br>Let me know the subject, grade level, and topic you are working on, and I will prepare the resources for you.</content><hint>Tip: Be specific about the grade level (e.g. Class 6) and board (e.g. CBSE) so I can adapt the resource complexity.</hint><steps><step number="1">Specify the topic or administrative task.</step><step number="2">Indicate grade level, class size, or time duration.</step><step number="3">Receive customized worksheets, plans, or drafts.</step></steps><question>What is the best way to structure an AI query for lesson plans?<option correct="false">Just type the topic name</option><option correct="true">Include topic, grade, duration, and objective</option><option correct="false">Omit grade level information</option></question><media_query>Interactive classroom activities</media_query><followups><followup>Help me plan a classroom activity</followup><followup>Generate sample quiz questions</followup></followups></response>"""

        # Split into words to stream token-by-token
        words = re.findall(r'.*?\s+|.+', mock_resp)
        for word in words:
            yield word
            await asyncio.sleep(0.01)
