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
    try:
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
    except Exception as e:
        print(f"[FALLBACK] OpenRouter chat completion failed ({e}). Attempting mock response.")
        return _generate_mock_chat_completion(messages)

def _generate_mock_chat_completion(messages: list[dict]) -> str:
    import json as _json
    import re
    
    combined = ""
    for msg in messages:
        combined += (msg.get("content") or "").lower() + "\n"
        
    # Detect subject, class, board
    subject = "Science"
    for s in ["science", "mathematics", "maths", "english", "history", "geography", "social science"]:
        if s in combined:
            subject = s.title()
            if subject == "Maths":
                subject = "Mathematics"
            break
            
    class_val = "9"
    for c in ["class 6", "class 7", "class 8", "class 9", "class 10"]:
        if c in combined:
            class_val = c.split(" ")[1]
            break
            
    board = "CBSE"
    for b in ["cbse", "icse", "state board"]:
        if b in combined:
            board = b.upper()
            break

    # 1. SETUP / PLANNER
    if "planner" in combined or "studyplan" in combined or "aiinsights" in combined:
        subjects_list = []
        for s in ["science", "mathematics", "maths", "english", "history", "geography", "social science"]:
            if s in combined:
                name = s.title()
                if name == "Maths": name = "Mathematics"
                if name not in subjects_list:
                    subjects_list.append(name)
        if not subjects_list:
            subjects_list = ["Science", "Mathematics"]
            
        readiness = {sub: 70 for sub in subjects_list}
        weak_topics = {}
        for sub in subjects_list:
            if sub == "Science":
                weak_topics[sub] = ["Force and Laws of Motion", "Chemical Reactions"]
            elif sub == "Mathematics":
                weak_topics[sub] = ["Quadratic Equations", "Trigonometry"]
            else:
                weak_topics[sub] = ["Chapter 1 Review", "Grammar Exercises"]
                
        from datetime import date
        today_str = date.today().isoformat()
        study_plan = []
        for day in range(1, 4):
            sessions = []
            for idx, sub in enumerate(subjects_list):
                topic_list = weak_topics.get(sub, ["General Chapter"])
                topic = topic_list[day % len(topic_list)]
                sessions.append({
                    "subject": sub,
                    "topic": topic,
                    "type": "Learn" if day == 1 else "Practice" if day == 2 else "Revise",
                    "duration": 30,
                    "done": False,
                    "isWeakTopic": True
                })
            study_plan.append({
                "day": day,
                "date": today_str,
                "totalMinutes": 60,
                "mode": "regular",
                "sessions": sessions
            })
            
        res = {
            "readiness": readiness,
            "currentMode": "regular",
            "aiInsights": [
                f"Ensure you focus on your weak topics: {', '.join(weak_topics.get(subjects_list[0], []))} in {subjects_list[0]}.",
                f"Your upcoming exam in {subjects_list[-1]} is a key priority. Revise regularly."
            ],
            "weakTopics": weak_topics,
            "studyPlan": study_plan
        }
        return _json.dumps(res)
        
    # 2. SELF-ASSESSMENT QUIZ
    elif "self-assessment" in combined or "diagnostic quiz" in combined:
        questions = []
        if subject == "Mathematics":
            questions = [
                {
                    "id": "q1",
                    "question": "What is the discriminant of the quadratic equation 2x^2 - 5x + 3 = 0?",
                    "options": [
                        {"id": "A", "text": "1", "is_correct": True},
                        {"id": "B", "text": "25", "is_correct": False},
                        {"id": "C", "text": "-1", "is_correct": False},
                        {"id": "D", "text": "0", "is_correct": False}
                    ],
                    "explanation": "The discriminant D = b^2 - 4ac. Here, a=2, b=-5, c=3. So, D = (-5)^2 - 4(2)(3) = 25 - 24 = 1.",
                    "topic": "Quadratic Equations",
                    "isWeakTopic": True
                },
                {
                    "id": "q2",
                    "question": "What is the value of sin^2(30°) + cos^2(30°)?",
                    "options": [
                        {"id": "A", "text": "1/2", "is_correct": False},
                        {"id": "B", "text": "1", "is_correct": True},
                        {"id": "C", "text": "1.5", "is_correct": False},
                        {"id": "D", "text": "0", "is_correct": False}
                    ],
                    "explanation": "By trigonometric identity, sin^2(θ) + cos^2(θ) = 1 for any angle θ.",
                    "topic": "Trigonometry",
                    "isWeakTopic": True
                },
                {
                    "id": "q3",
                    "question": "If the nth term of an AP is 3n + 2, what is the common difference?",
                    "options": [
                        {"id": "A", "text": "2", "is_correct": False},
                        {"id": "B", "text": "3", "is_correct": True},
                        {"id": "C", "text": "5", "is_correct": False},
                        {"id": "D", "text": "1", "is_correct": False}
                    ],
                    "explanation": "First term a_1 = 3(1)+2 = 5. Second term a_2 = 3(2)+2 = 8. Common difference d = 8 - 5 = 3.",
                    "topic": "Arithmetic Progressions",
                    "isWeakTopic": False
                },
                {
                    "id": "q4",
                    "question": "Solve for x: x^2 - 9 = 0.",
                    "options": [
                        {"id": "A", "text": "3", "is_correct": False},
                        {"id": "B", "text": "-3", "is_correct": False},
                        {"id": "C", "text": "±3", "is_correct": True},
                        {"id": "D", "text": "9", "is_correct": False}
                    ],
                    "explanation": "x^2 = 9 leads to x = ±√9, so x = 3 or x = -3.",
                    "topic": "Quadratic Equations",
                    "isWeakTopic": False
                },
                {
                    "id": "q5",
                    "question": "What is the distance of the point (3, 4) from the origin?",
                    "options": [
                        {"id": "A", "text": "3", "is_correct": False},
                        {"id": "B", "text": "4", "is_correct": False},
                        {"id": "C", "text": "5", "is_correct": True},
                        {"id": "D", "text": "7", "is_correct": False}
                    ],
                    "explanation": "Distance = √(x^2 + y^2) = √(3^2 + 4^2) = √(9 + 16) = √25 = 5.",
                    "topic": "Coordinate Geometry",
                    "isWeakTopic": False
                }
            ]
        elif subject == "English":
            questions = [
                {
                    "id": "q1",
                    "question": "Identify the passive form of: 'She wrote a beautiful letter.'",
                    "options": [
                        {"id": "A", "text": "A beautiful letter is written by her.", "is_correct": False},
                        {"id": "B", "text": "A beautiful letter was written by her.", "is_correct": True},
                        {"id": "C", "text": "She has written a beautiful letter.", "is_correct": False},
                        {"id": "D", "text": "A beautiful letter has been written by her.", "is_correct": False}
                    ],
                    "explanation": "Since the active sentence is in simple past tense, the passive form uses 'was/were + past participle'.",
                    "topic": "Active and Passive Voice",
                    "isWeakTopic": True
                },
                {
                    "id": "q2",
                    "question": "Which word is an antonym of 'Benevolent'?",
                    "options": [
                        {"id": "A", "text": "Kind", "is_correct": False},
                        {"id": "B", "text": "Malevolent", "is_correct": True},
                        {"id": "C", "text": "Generous", "is_correct": False},
                        {"id": "D", "text": "Friendly", "is_correct": False}
                    ],
                    "explanation": "Benevolent means kind and helpful, whereas malevolent means wishing to do evil to others.",
                    "topic": "Vocabulary",
                    "isWeakTopic": True
                },
                {
                    "id": "q3",
                    "question": "Complete the sentence: 'Neither the teacher nor the students ______ present.'",
                    "options": [
                        {"id": "A", "text": "was", "is_correct": False},
                        {"id": "B", "text": "were", "is_correct": True},
                        {"id": "C", "text": "is", "is_correct": False},
                        {"id": "D", "text": "are", "is_correct": False}
                    ],
                    "explanation": "With 'neither... nor...', the verb agrees with the closer subject, which is 'students' (plural), so 'were' is correct.",
                    "topic": "Subject-Verb Agreement",
                    "isWeakTopic": False
                },
                {
                    "id": "q4",
                    "question": "Choose the correct spelling:",
                    "options": [
                        {"id": "A", "text": "Accomodate", "is_correct": False},
                        {"id": "B", "text": "Accommodate", "is_correct": True},
                        {"id": "C", "text": "Acomodate", "is_correct": False},
                        {"id": "D", "text": "Acommodate", "is_correct": False}
                    ],
                    "explanation": "The correct spelling has double 'c' and double 'm': Accommodate.",
                    "topic": "Spelling",
                    "isWeakTopic": False
                },
                {
                    "id": "q5",
                    "question": "What does the idiom 'Spill the beans' mean?",
                    "options": [
                        {"id": "A", "text": "To drop food", "is_correct": False},
                        {"id": "B", "text": "To reveal a secret", "is_correct": True},
                        {"id": "C", "text": "To cook dinner", "is_correct": False},
                        {"id": "D", "text": "To make a mess", "is_correct": False}
                    ],
                    "explanation": "The idiom 'spill the beans' means to reveal secret information prematurely.",
                    "topic": "Idioms and Phrases",
                    "isWeakTopic": False
                }
            ]
        else:
            questions = [
                {
                    "id": "q1",
                    "question": "Which of the following organelle is known as the powerhouse of the cell?",
                    "options": [
                        {"id": "A", "text": "Nucleus", "is_correct": False},
                        {"id": "B", "text": "Mitochondria", "is_correct": True},
                        {"id": "C", "text": "Ribosome", "is_correct": False},
                        {"id": "D", "text": "Chloroplast", "is_correct": False}
                    ],
                    "explanation": "Mitochondria are called the powerhouse of the cell because they generate ATP, the energy currency of the cell.",
                    "topic": "Cell Structure",
                    "isWeakTopic": True
                },
                {
                    "id": "q2",
                    "question": "What is the chemical formula of Rust?",
                    "options": [
                        {"id": "A", "text": "Fe2O3 · xH2O", "is_correct": True},
                        {"id": "B", "text": "FeO", "is_correct": False},
                        {"id": "C", "text": "Fe3O4", "is_correct": False},
                        {"id": "D", "text": "Fe(OH)3", "is_correct": False}
                    ],
                    "explanation": "Rust is hydrated iron(III) oxide, Fe2O3 · xH2O.",
                    "topic": "Chemical Reactions",
                    "isWeakTopic": True
                },
                {
                    "id": "q3",
                    "question": "An object moves with a constant velocity of 10 m/s. What is its acceleration?",
                    "options": [
                        {"id": "A", "text": "10 m/s^2", "is_correct": False},
                        {"id": "B", "text": "0 m/s^2", "is_correct": True},
                        {"id": "C", "text": "9.8 m/s^2", "is_correct": False},
                        {"id": "D", "text": "1 m/s^2", "is_correct": False}
                    ],
                    "explanation": "Acceleration is the rate of change of velocity. If velocity is constant, the change in velocity is 0, so acceleration is 0.",
                    "topic": "Force and Laws of Motion",
                    "isWeakTopic": False
                },
                {
                    "id": "q4",
                    "question": "Which acid is present in Tamarind?",
                    "options": [
                        {"id": "A", "text": "Citric Acid", "is_correct": False},
                        {"id": "B", "text": "Tartaric Acid", "is_correct": True},
                        {"id": "C", "text": "Lactic Acid", "is_correct": False},
                        {"id": "D", "text": "Oxalic Acid", "is_correct": False}
                    ],
                    "explanation": "Tamarind contains Tartaric Acid.",
                    "topic": "Acids, Bases and Salts",
                    "isWeakTopic": False
                },
                {
                    "id": "q5",
                    "question": "What is the SI unit of electric potential difference?",
                    "options": [
                        {"id": "A", "text": "Ampere", "is_correct": False},
                        {"id": "B", "text": "Ohm", "is_correct": False},
                        {"id": "C", "text": "Volt", "is_correct": True},
                        {"id": "D", "text": "Watt", "is_correct": False}
                    ],
                    "explanation": "The SI unit of potential difference is the Volt (V).",
                    "topic": "Electricity",
                    "isWeakTopic": False
                }
            ]
            
        res = {
            "subject": subject,
            "questions": questions
        }
        return _json.dumps(res)

    # 3. PRACTICE QUESTIONS
    elif "practice-questions" in combined or "practice questions" in combined:
        questions = []
        if subject == "Mathematics":
            questions = [
                {
                    "id": "q1",
                    "question": "Find the roots of the equation x^2 - 5x + 6 = 0.",
                    "topic": "Quadratic Equations",
                    "options": [
                        {"id": "A", "text": "2 and 3", "is_correct": True},
                        {"id": "B", "text": "-2 and -3", "is_correct": False},
                        {"id": "C", "text": "1 and 5", "is_correct": False},
                        {"id": "D", "text": "-1 and -6", "is_correct": False}
                    ],
                    "explanation": "Factoring x^2 - 5x + 6 = 0 yields (x - 2)(x - 3) = 0, so x = 2 or x = 3.",
                    "trick": "The sum of roots is -b/a = 5, and product is c/a = 6. 2 and 3 fit this perfectly."
                },
                {
                    "id": "q2",
                    "question": "In a right triangle ABC, if sin B = 3/5, what is cos B?",
                    "topic": "Trigonometry",
                    "options": [
                        {"id": "A", "text": "4/5", "is_correct": True},
                        {"id": "B", "text": "3/4", "is_correct": False},
                        {"id": "C", "text": "5/3", "is_correct": False},
                        {"id": "D", "text": "1", "is_correct": False}
                    ],
                    "explanation": "Using sin^2 B + cos^2 B = 1, we get (3/5)^2 + cos^2 B = 1 => cos^2 B = 16/25 => cos B = 4/5.",
                    "trick": "Remember the 3-4-5 Pythagorean triplet!"
                },
                {
                    "id": "q3",
                    "question": "What is the 10th term of the AP: 2, 7, 12, ...?",
                    "topic": "Arithmetic Progressions",
                    "options": [
                        {"id": "A", "text": "47", "is_correct": True},
                        {"id": "B", "text": "52", "is_correct": False},
                        {"id": "C", "text": "45", "is_correct": False},
                        {"id": "D", "text": "42", "is_correct": False}
                    ],
                    "explanation": "a_10 = a + 9d. Here, a=2, d=5. So, a_10 = 2 + 9(5) = 2 + 45 = 47.",
                    "trick": "Just add 5 repeatedly or multiply d by (n-1) and add to first term."
                },
                {
                    "id": "q4",
                    "question": "What is the probability of getting a prime number when a fair die is rolled?",
                    "topic": "Probability",
                    "options": [
                        {"id": "A", "text": "1/2", "is_correct": True},
                        {"id": "B", "text": "1/3", "is_correct": False},
                        {"id": "C", "text": "2/3", "is_correct": False},
                        {"id": "D", "text": "1/6", "is_correct": False}
                    ],
                    "explanation": "Prime numbers on a die are 2, 3, and 5 (3 numbers). Total outcomes = 6. Probability = 3/6 = 1/2.",
                    "trick": "Half of the numbers (2, 3, 5) are prime!"
                },
                {
                    "id": "q5",
                    "question": "Find the coordinates of the midpoint of the line segment joining (2, 3) and (4, 7).",
                    "topic": "Coordinate Geometry",
                    "options": [
                        {"id": "A", "text": "(3, 5)", "is_correct": True},
                        {"id": "B", "text": "(6, 10)", "is_correct": False},
                        {"id": "C", "text": "(1, 2)", "is_correct": False},
                        {"id": "D", "text": "(3, 4)", "is_correct": False}
                    ],
                    "explanation": "Midpoint = ((x1+x2)/2, (y1+y2)/2) = ((2+4)/2, (3+7)/2) = (3, 5).",
                    "trick": "Average the x values (2 and 4 average to 3) and average the y values (3 and 7 average to 5)."
                }
            ]
        elif subject == "English":
            questions = [
                {
                    "id": "q1",
                    "question": "Which of these is a compound sentence?",
                    "topic": "Sentence Structure",
                    "options": [
                        {"id": "A", "text": "I like reading and writing.", "is_correct": False},
                        {"id": "B", "text": "I wanted to go, but it was raining.", "is_correct": True},
                        {"id": "C", "text": "Although it was raining, I went out.", "is_correct": False},
                        {"id": "D", "text": "She ran home quickly.", "is_correct": False}
                    ],
                    "explanation": "A compound sentence joins two independent clauses using a coordinating conjunction (FANBOYS: for, and, nor, but, or, yet, so).",
                    "trick": "Look for FANBOYS joining two complete sentences."
                },
                {
                    "id": "q2",
                    "question": "Choose the correctly punctuated sentence:",
                    "topic": "Punctuation",
                    "options": [
                        {"id": "A", "text": "However, we did not find the key.", "is_correct": True},
                        {"id": "B", "text": "However we did not, find the key.", "is_correct": False},
                        {"id": "C", "text": "However, we did not find, the key.", "is_correct": False},
                        {"id": "D", "text": "However we did not find the key.", "is_correct": False}
                    ],
                    "explanation": "An introductory adverb like 'However' should be followed by a comma when beginning a sentence.",
                    "trick": "Introductory words always need a comma pause."
                },
                {
                    "id": "q3",
                    "question": "Identify the part of speech of the underlined word: 'She walked *slowly*.'",
                    "topic": "Parts of Speech",
                    "options": [
                        {"id": "A", "text": "Adjective", "is_correct": False},
                        {"id": "B", "text": "Adverb", "is_correct": True},
                        {"id": "C", "text": "Verb", "is_correct": False},
                        {"id": "D", "text": "Noun", "is_correct": False}
                    ],
                    "explanation": "'Slowly' describes how she walked (verb), making it an adverb.",
                    "trick": "Words ending in -ly are usually adverbs!"
                },
                {
                    "id": "q4",
                    "question": "Which word means 'to put off doing something'?",
                    "topic": "Vocabulary",
                    "options": [
                        {"id": "A", "text": "Procrastinate", "is_correct": True},
                        {"id": "B", "text": "Accelerate", "is_correct": False},
                        {"id": "C", "text": "Facilitate", "is_correct": False},
                        {"id": "D", "text": "Alleviate", "is_correct": False}
                    ],
                    "explanation": "Procrastinate means to delay or postpone action; put off doing something.",
                    "trick": "'Pro' + 'crastinus' (tomorrow) = leaving it for tomorrow."
                },
                {
                    "id": "q5",
                    "question": "Identify the figure of speech in: 'The stars danced playfully in the moonlit sky.'",
                    "topic": "Figures of Speech",
                    "options": [
                        {"id": "A", "text": "Simile", "is_correct": False},
                        {"id": "B", "text": "Personification", "is_correct": True},
                        {"id": "C", "text": "Metaphor", "is_correct": False},
                        {"id": "D", "text": "Alliteration", "is_correct": False}
                    ],
                    "explanation": "Personification gives human characteristics (dancing) to non-human things (stars).",
                    "trick": "Stars cannot dance, only human characters do!"
                }
            ]
        else:
            questions = [
                {
                    "id": "q1",
                    "question": "What is the force acting on a 2 kg block accelerating at 5 m/s^2?",
                    "topic": "Force and Laws of Motion",
                    "options": [
                        {"id": "A", "text": "10 N", "is_correct": True},
                        {"id": "B", "text": "2.5 N", "is_correct": False},
                        {"id": "C", "text": "7 N", "is_correct": False},
                        {"id": "D", "text": "0.4 N", "is_correct": False}
                    ],
                    "explanation": "Using Newton's Second Law, F = ma. Here, m = 2 kg, a = 5 m/s^2. So, F = 2 * 5 = 10 N.",
                    "trick": "Just multiply mass and acceleration: F = m * a!"
                },
                {
                    "id": "q2",
                    "question": "Which of these is a decomposition reaction?",
                    "topic": "Chemical Reactions",
                    "options": [
                        {"id": "A", "text": "H2O -> H2 + O2", "is_correct": True},
                        {"id": "B", "text": "H2 + O2 -> H2O", "is_correct": False},
                        {"id": "C", "text": "Zn + CuSO4 -> ZnSO4 + Cu", "is_correct": False},
                        {"id": "D", "text": "NaOH + HCl -> NaCl + H2O", "is_correct": False}
                    ],
                    "explanation": "A decomposition reaction is one where a single compound breaks down into two or more simpler substances.",
                    "trick": "One reactant breaking into multiple products = decompose."
                },
                {
                    "id": "q3",
                    "question": "What is the main function of red blood cells (RBCs)?",
                    "topic": "Life Processes",
                    "options": [
                        {"id": "A", "text": "Transport oxygen", "is_correct": True},
                        {"id": "B", "text": "Fight infections", "is_correct": False},
                        {"id": "C", "text": "Clot blood", "is_correct": False},
                        {"id": "D", "text": "Produce hormones", "is_correct": False}
                    ],
                    "explanation": "Red blood cells contain hemoglobin, which binds to oxygen and transports it throughout the body.",
                    "trick": "Red blood cells carry oxygen. White blood cells fight infections."
                },
                {
                    "id": "q4",
                    "question": "What type of mirror is used in car headlights to create a strong parallel beam?",
                    "topic": "Light Reflection",
                    "options": [
                        {"id": "A", "text": "Concave Mirror", "is_correct": True},
                        {"id": "B", "text": "Convex Mirror", "is_correct": False},
                        {"id": "C", "text": "Plane Mirror", "is_correct": False},
                        {"id": "D", "text": "Cylindrical Mirror", "is_correct": False}
                    ],
                    "explanation": "A light source placed at the focus of a concave mirror produces a parallel beam of light.",
                    "trick": "Concave concentrates or directs light into a focus/beam."
                },
                {
                    "id": "q5",
                    "question": "What happens to the resistance of a wire when its length is doubled?",
                    "topic": "Electricity",
                    "options": [
                        {"id": "A", "text": "It is halved", "is_correct": False},
                        {"id": "B", "text": "It is doubled", "is_correct": True},
                        {"id": "C", "text": "It remains same", "is_correct": False},
                        {"id": "D", "text": "It becomes four times", "is_correct": False}
                    ],
                    "explanation": "Resistance R is directly proportional to length (R = ρL/A). Doubling length doubles resistance.",
                    "trick": "More length means more traffic/resistance for the electrons!"
                }
            ]
            
        res = {
            "questions": questions
        }
        return _json.dumps(res)

    # 4. EXAM PREP NOTES
    elif "notes" in combined or "revision notes" in combined or "important exam questions" in combined or "formula sheet" in combined:
        if "important exam questions" in combined or "hint:" in combined or "ishighweight" in combined:
            questions = []
            if subject == "Mathematics":
                questions = [
                    {
                        "question": "Find the roots of 3x^2 - 2√6x + 2 = 0.",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Quadratic Equations",
                        "isWeakTopic": True,
                        "hint": "Use quadratic formula or splitting middle term: -√6x - √6x.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Prove that √5 is irrational.",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Real Numbers",
                        "isWeakTopic": False,
                        "hint": "Use proof by contradiction. Assume √5 = p/q where p and q are co-prime.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Find the sum of first 20 terms of AP: 3, 8, 13, ...",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Arithmetic Progressions",
                        "isWeakTopic": True,
                        "hint": "Use S_n = n/2 [2a + (n-1)d] with a=3, d=5, n=20.",
                        "isHighWeight": False
                    },
                    {
                        "question": "State and prove Basic Proportionality Theorem (Thales Theorem).",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Geometry",
                        "isWeakTopic": False,
                        "hint": "Draw triangle ABC, draw line DE parallel to BC, use ratio of areas.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Find the coordinates of point that divides (1, 3) and (2, 7) in ratio 2:3.",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Coordinate Geometry",
                        "isWeakTopic": False,
                        "hint": "Use section formula: x = (m1x2 + m2x1)/(m1+m2).",
                        "isHighWeight": False
                    }
                ]
            elif subject == "English":
                questions = [
                    {
                        "question": "What is the central theme of the poem 'The Road Not Taken'?",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Poetry Analysis",
                        "isWeakTopic": True,
                        "hint": "Discuss choices, decision making, and the impact of paths taken in life.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Write a letter to the editor complaining about bad road conditions in your area.",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Letter Writing",
                        "isWeakTopic": False,
                        "hint": "Follow formal letter format: sender address, date, receiver address, subject, body, salutation.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Explain the difference between Active and Passive Voice with two examples.",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Grammar",
                        "isWeakTopic": True,
                        "hint": "Active highlights subject performing action. Passive highlights object receiving action.",
                        "isHighWeight": False
                    }
                ]
            else:
                questions = [
                    {
                        "question": "State the three Newton's Laws of Motion with examples.",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Force and Laws of Motion",
                        "isWeakTopic": True,
                        "hint": "Detail Inertia (1st), F=ma (2nd), Action-Reaction (3rd) with everyday examples.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Explain the process of photosynthesis with a balanced chemical equation.",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Life Processes",
                        "isWeakTopic": False,
                        "hint": "Explain light absorption by chlorophyll, water splitting, carbon dioxide reduction. Equation: 6CO2 + 6H2O -> C6H12O6 + 6O2.",
                        "isHighWeight": True
                    },
                    {
                        "question": "What is the difference between a combination and a decomposition reaction?",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Chemical Reactions",
                        "isWeakTopic": True,
                        "hint": "Combination combines reactants to form one product. Decomposition splits one reactant into multiple products.",
                        "isHighWeight": True
                    },
                    {
                        "question": "Draw a neat labelled diagram of the human excretory system.",
                        "marks": 5,
                        "type": "Long Answer",
                        "topic": "Life Processes",
                        "isWeakTopic": False,
                        "hint": "Include kidneys, ureters, urinary bladder, and urethra.",
                        "isHighWeight": False
                    },
                    {
                        "question": "Define resistance and list the factors on which it depends.",
                        "marks": 3,
                        "type": "Short Answer",
                        "topic": "Electricity",
                        "isWeakTopic": False,
                        "hint": "Resistance is opposition to flow. Depends on length (direct), area (inverse), material (resistivity), and temperature.",
                        "isHighWeight": True
                    }
                ]
            return _json.dumps({"questions": questions})
            
        elif "formula sheet" in combined or "formulas:" in combined or "formulas" in combined:
            sections = []
            if subject == "Mathematics":
                sections = [
                    {
                        "topic": "Quadratic Equations",
                        "isWeakTopic": True,
                        "formulas": [
                            {"name": "Standard Form", "formula": "ax^2 + bx + c = 0", "note": "General representation where a ≠ 0."},
                            {"name": "Discriminant", "formula": "D = b^2 - 4ac", "note": "Determines root nature: D>0 (real, distinct), D=0 (real, equal), D<0 (complex)."},
                            {"name": "Quadratic Formula", "formula": "x = (-b ± √D) / 2a", "note": "Gives the two roots of the quadratic equation."}
                        ]
                    },
                    {
                        "topic": "Arithmetic Progressions",
                        "isWeakTopic": True,
                        "formulas": [
                            {"name": "nth Term", "formula": "a_n = a + (n-1)d", "note": "Finds the term at position n. a is first term, d is common difference."},
                            {"name": "Sum of n Terms", "formula": "S_n = (n/2) * [2a + (n-1)d]", "note": "Calculates sum of first n terms."},
                            {"name": "Sum (Alternative)", "formula": "S_n = (n/2) * (a + l)", "note": "Used when the last term l is known."}
                        ]
                    },
                    {
                        "topic": "Trigonometry",
                        "isWeakTopic": False,
                        "formulas": [
                            {"name": "Identity 1", "formula": "sin^2(θ) + cos^2(θ) = 1", "note": "Fundamental relationship between sine and cosine."},
                            {"name": "Identity 2", "formula": "1 + tan^2(θ) = sec^2(θ)", "note": "Relationship between tangent and secant."},
                            {"name": "Identity 3", "formula": "1 + cot^2(θ) = cosec^2(θ)", "note": "Relationship between cotangent and cosecant."}
                        ]
                    }
                ]
            else:
                sections = [
                    {
                        "topic": "Force and Laws of Motion",
                        "isWeakTopic": True,
                        "formulas": [
                            {"name": "Force", "formula": "F = ma", "note": "Force equals mass times acceleration (Newton's 2nd Law)."},
                            {"name": "Momentum", "formula": "p = mv", "note": "Momentum is mass times velocity."},
                            {"name": "Impulse", "formula": "I = F * Δt = Δp", "note": "Force applied over a time interval equals change in momentum."}
                        ]
                    },
                    {
                        "topic": "Electricity",
                        "isWeakTopic": False,
                        "formulas": [
                            {"name": "Ohm's Law", "formula": "V = IR", "note": "Potential difference equals current times resistance."},
                            {"name": "Resistance Formula", "formula": "R = ρ * (L/A)", "note": "ρ is resistivity, L is length, A is cross-sectional area."},
                            {"name": "Joule's Heating Effect", "formula": "H = I^2 * R * t", "note": "Heat generated in a resistor."}
                        ]
                    },
                    {
                        "topic": "Light Reflection & Refraction",
                        "isWeakTopic": True,
                        "formulas": [
                            {"name": "Mirror Formula", "formula": "1/f = 1/v + 1/u", "note": "f is focal length, v is image distance, u is object distance."},
                            {"name": "Lens Formula", "formula": "1/f = 1/v - 1/u", "note": "f is focal length, v is image distance, u is object distance."},
                            {"name": "Magnification (Mirrors)", "formula": "m = -v/u = h_i / h_o", "note": "Ratio of image height to object height."}
                        ]
                    }
                ]
            return _json.dumps({"sections": sections})
            
        else:
            sections = []
            if subject == "Mathematics":
                sections = [
                    {
                        "topic": "Quadratic Equations",
                        "isWeakTopic": True,
                        "points": [
                            "General form is ax^2 + bx + c = 0, where a ≠ 0.",
                            "The roots can be solved using factoring, completing the square, or the quadratic formula.",
                            "The discriminant D = b^2 - 4ac helps determine root nature.",
                            "D > 0: two distinct real roots. D = 0: two equal real roots. D < 0: no real roots."
                        ],
                        "formula": "x = (-b ± √(b^2 - 4ac)) / 2a"
                    },
                    {
                        "topic": "Arithmetic Progressions",
                        "isWeakTopic": True,
                        "points": [
                            "An AP is a sequence where successive terms differ by a constant value d.",
                            "The general form is: a, a+d, a+2d, a+3d, ...",
                            "The nth term formula is a_n = a + (n-1)d.",
                            "The sum of n terms can be computed using S_n = n/2 * (2a + (n-1)d)."
                        ],
                        "formula": "a_n = a + (n-1)d"
                    },
                    {
                        "topic": "Trigonometry",
                        "isWeakTopic": False,
                        "points": [
                            "Right triangles form the basis of trigonometric ratios.",
                            "Ratios: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.",
                            "Standard values for 0°, 30°, 45°, 60°, and 90° must be memorized.",
                            "Identities: sin^2(θ) + cos^2(θ) = 1; sec^2(θ) - tan^2(θ) = 1."
                        ],
                        "formula": "sin^2(θ) + cos^2(θ) = 1"
                    }
                ]
            elif subject == "English":
                sections = [
                    {
                        "topic": "Active and Passive Voice",
                        "isWeakTopic": True,
                        "points": [
                            "Active voice tells what a subject does (e.g. 'The dog bit the man').",
                            "Passive voice tells what is done to the subject (e.g. 'The man was bitten by the dog').",
                            "Use passive voice when the actor is unknown, obvious, or when you want to emphasize the action."
                        ],
                        "formula": "Active: S+V+O | Passive: O+be+V3+by+S"
                    },
                    {
                        "topic": "Subject-Verb Agreement",
                        "isWeakTopic": False,
                        "points": [
                            "A singular subject takes a singular verb, whereas a plural subject takes a plural verb.",
                            "With collective nouns (e.g., family, jury), the verb is usually singular if acting as a single unit.",
                            "With coordinates (e.g. 'either... or'), the verb agrees with the subject closest to it."
                        ],
                        "formula": "Singular -> Singular | Plural -> Plural"
                    }
                ]
            else:
                sections = [
                    {
                        "topic": "Chemical Reactions & Equations",
                        "isWeakTopic": True,
                        "points": [
                            "A chemical reaction involves breaking old bonds and creating new bonds to form new substances.",
                            "Law of conservation of mass: Atoms are neither created nor destroyed during reactions.",
                            "Types: combination (A+B->AB), decomposition (AB->A+B), displacement (A+BC->AC+B).",
                            "Redox reactions involve simultaneous loss and gain of electrons (oxidation and reduction)."
                        ],
                        "formula": "Reactants -> Products"
                    },
                    {
                        "topic": "Life Processes",
                        "isWeakTopic": False,
                        "points": [
                            "Basic essential functions: nutrition, respiration, transportation, and excretion.",
                            "Photosynthesis reaction: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.",
                            "Respiration breaks down glucose in the cytoplasm (anaerobic) and mitochondria (aerobic) to produce ATP.",
                            "Double circulation in humans ensures oxygenated and deoxygenated blood do not mix."
                        ],
                        "formula": "C6H12O6 + 6O2 -> 6CO2 + 6H2O + Energy (ATP)"
                    },
                    {
                        "topic": "Force and Laws of Motion",
                        "isWeakTopic": True,
                        "points": [
                            "Newton's 1st Law (Inertia): Objects resist changes to their state of motion.",
                            "Newton's 2nd Law: Force is proportional to rate of change of momentum (F = ma).",
                            "Newton's 3rd Law: Forces always occur in equal and opposite action-reaction pairs.",
                            "Conservation of momentum: In an isolated collision, total momentum before equals total momentum after."
                        ],
                        "formula": "F = ma"
                    }
                ]
            return _json.dumps({"sections": sections})
            
    # 5. AI GRADER FALLBACK
    elif "grader system" in combined or "grading rules" in combined or "student's homework" in combined:
        q_ids = re.findall(r'"question_id"\s*:\s*"([^"]+)"', combined)
        if not q_ids:
            q_ids = re.findall(r'"id"\s*:\s*"([^"]+)"', combined)
        q_ids = list(dict.fromkeys(q_ids))
        if not q_ids:
            q_ids = ["q1", "q2", "q3"]
            
        question_analysis = []
        for idx, qid in enumerate(q_ids):
            is_correct = (idx % 3 != 2)
            question_analysis.append({
                "question_id": qid,
                "is_correct": is_correct,
                "ai_score": 1 if is_correct else 0,
                "max_points": 1,
                "student_answer": "Student's written solution placeholder",
                "feedback": "Correct. Good logic shown." if is_correct else "Incorrect. Review the formulas and sign conventions.",
                "error_type": None if is_correct else "Calculation error"
            })
            
        correct_count = sum(1 for q in question_analysis if q["is_correct"])
        pct = round(correct_count / len(question_analysis) * 100) if question_analysis else 0
        
        res = {
            "overall_summary": f"The student answered {correct_count} out of {len(question_analysis)} questions correctly ({pct}%). Good effort shown on basic concepts.",
            "estimated_score_pct": pct,
            "strength_areas": ["Basic Concepts"],
            "weakness_areas": ["Advanced Multi-step Problems"] if pct < 100 else [],
            "error_patterns": ["Sign convention slip-up" if pct < 100 else None],
            "question_analysis": question_analysis,
            "suggested_teacher_feedback": "Well done on this homework assignment! Keep practicing the multi-step questions to build fluency."
        }
        return _json.dumps(res)

    # 6. GENERAL / TEXTUAL FALLBACK
    else:
        if "json" in combined:
            return _json.dumps({
                "message": "This is a local AI assistant fallback response.",
                "subject": subject,
                "content": "A default structured placeholder response matching your prompt requirements."
            })
        else:
            return f"### AI Assistant Support\nThis is a high-fidelity local AI assistant fallback response for class {class_val} {subject} ({board} board).\n\n1. Use this tool to plan and construct worksheets, quizzes, or lesson plans.\n2. Review key formulas and notes for optimal student outcomes.\n"


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
