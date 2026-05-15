#!/usr/bin/env python3
"""
Test script to verify query cleaning for media search.
"""
import re

# Copy the regex from media_search.py
_GRADE_STRIP = re.compile(
    r"\b(class|grade|std|standard|cbse|icse|igcse|ncert|board)\s*[\d\-a-z]*\b",
    re.IGNORECASE,
)

def _clean_query(query: str) -> str:
    """Strip grade/board metadata so Wikipedia/Commons searches stay topic-focused."""
    # Remove common grade patterns like "Grade 6-A", "Class 9", "CBSE", etc.
    cleaned = _GRADE_STRIP.sub("", query).strip()
    # Remove extra spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned if cleaned else query

# Test cases
test_cases = [
    ("Hello, can you explain me what is Energy Grade 6-A", "Energy"),
    ("What is photosynthesis Class 9", "What is photosynthesis"),
    ("Newton's laws of motion Grade 10 CBSE", "Newton's laws of motion"),
    ("Water cycle Grade 6", "Water cycle"),
    ("Mitochondria structure Class 11", "Mitochondria structure"),
    ("Quadratic equations Grade 10 ICSE", "Quadratic equations"),
    ("Solar system", "Solar system"),
    ("Energy", "Energy"),
]

print("=" * 80)
print("TESTING QUERY CLEANING")
print("=" * 80)

for original, expected in test_cases:
    cleaned = _clean_query(original)
    status = "✅" if cleaned == expected else "❌"
    print(f"\n{status} Original: {original}")
    print(f"   Expected: {expected}")
    print(f"   Got:      {cleaned}")
    if cleaned != expected:
        print(f"   MISMATCH!")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
