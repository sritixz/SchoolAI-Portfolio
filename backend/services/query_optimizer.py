"""
Educational Media Researcher - Query Optimization Service

Transforms student conversation history into high-precision image search queries
optimized for educational content discovery.

Strategy:
1. Extract core topic (scientific/historical/technical noun)
2. Inject educational intent (labeled diagram, infographic, schematic)
3. Apply visual constraints (transparent background, PNG, SVG)
4. Contextualize grade level
5. Exclude noise (screenshots, logos, flags, photos)
"""

import re
import logging
from typing import Optional, Dict, List

log = logging.getLogger(__name__)

# ── Educational Intent Keywords ──────────────────────────────────────────────
EDUCATIONAL_INTENT_KEYWORDS = [
    "labeled diagram",
    "infographic",
    "schematic",
    "structure",
    "anatomy",
    "cross-section",
    "flowchart",
    "process diagram",
    "illustration",
    "educational",
    "teaching material",
]

# ── Visual Constraint Keywords ───────────────────────────────────────────────
VISUAL_CONSTRAINT_KEYWORDS = [
    "transparent background",
    "PNG",
    "SVG",
    "high contrast",
    "clean design",
    "vector",
]

# ── Noise Exclusion Keywords ─────────────────────────────────────────────────
NOISE_EXCLUSION_KEYWORDS = [
    "-screenshot",
    "-logo",
    "-flag",
    "-photo",
    "-photograph",
    "-selfie",
    "-portrait",
    "-banner",
    "-icon",
    "-thumbnail",
]

# ── Educational Source Domains ──────────────────────────────────────────────
EDUCATIONAL_SOURCES = [
    "site:wikimedia.org",
    "site:wikipedia.org",
    "site:britannica.com",
    "site:khanacademy.org",
    "site:pbs.org",
]

# ── Core Topic Extraction Patterns ──────────────────────────────────────────
CORE_TOPIC_PATTERNS = {
    "biology": [
        r"(photosynthesis|mitosis|meiosis|respiration|digestion|circulation|nervous system|immune system|reproduction|evolution|genetics|dna|protein|enzyme|cell|organism|ecosystem|food chain|habitat)",
        r"(heart|lung|brain|liver|kidney|stomach|intestine|muscle|bone|blood|nerve)",
        r"(plant|animal|bacteria|virus|fungus|protist|algae)",
    ],
    "chemistry": [
        r"(atom|molecule|element|compound|reaction|oxidation|reduction|acid|base|salt|bond|valence|periodic table|electron|proton|neutron)",
        r"(combustion|neutralization|precipitation|decomposition|synthesis)",
    ],
    "physics": [
        r"(force|motion|velocity|acceleration|gravity|friction|energy|power|work|heat|temperature|light|sound|wave|electricity|magnetism|circuit|resistance|voltage|current)",
        r"(newton|law|momentum|inertia|pressure|density|buoyancy)",
    ],
    "history": [
        r"(revolution|empire|dynasty|civilization|war|treaty|invention|discovery|explorer|ancient|medieval|renaissance|industrial)",
    ],
    "geography": [
        r"(continent|ocean|mountain|river|desert|forest|climate|weather|latitude|longitude|map|terrain|erosion|weathering)",
    ],
    "mathematics": [
        r"(algebra|geometry|calculus|trigonometry|equation|function|graph|matrix|vector|probability|statistics|theorem|proof)",
    ],
}

# ── Grade-Level Context ─────────────────────────────────────────────────────
GRADE_CONTEXT = {
    "6": "Grade 6 CBSE",
    "7": "Grade 7 CBSE",
    "8": "Grade 8 CBSE",
    "9": "Grade 9 CBSE",
    "10": "Grade 10 CBSE",
    "11": "Grade 11 CBSE",
    "12": "Grade 12 CBSE",
}


class QueryOptimizer:
    """
    Transforms student queries into high-precision educational image search queries.
    """

    def __init__(self):
        self.core_topic = None
        self.grade = None
        self.board = None
        self.subject = None

    def extract_core_topic(self, text: str) -> Optional[str]:
        """
        Extract the primary scientific, historical, or technical noun.

        Example:
            "Can you explain the human heart for my class 10 exam?"
            → "human heart"
        """
        # Remove common filler words
        filler_pattern = r"\b(can you|explain|what is|what are|how|why|when|where|tell me|show me|help me|understand|learn|study|for my|for the|in my|in the|class|grade|exam|test|homework|assignment)\b"
        cleaned = re.sub(filler_pattern, "", text, flags=re.IGNORECASE).strip()

        # Remove question marks and extra punctuation
        cleaned = re.sub(r"[?!.,;:]", "", cleaned).strip()

        # Extract longest noun phrase (usually the core topic)
        # Look for 1-3 word phrases
        words = cleaned.split()
        if len(words) >= 2:
            # Try 3-word phrase first
            for i in range(len(words) - 2):
                phrase = " ".join(words[i : i + 3])
                if self._is_educational_term(phrase):
                    self.core_topic = phrase
                    return phrase

            # Try 2-word phrase
            for i in range(len(words) - 1):
                phrase = " ".join(words[i : i + 2])
                if self._is_educational_term(phrase):
                    self.core_topic = phrase
                    return phrase

        # Fallback: return first meaningful word
        if words:
            self.core_topic = words[0]
            return words[0]

        return None

    def _is_educational_term(self, phrase: str) -> bool:
        """Check if phrase is an educational term."""
        phrase_lower = phrase.lower()

        for subject, patterns in CORE_TOPIC_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, phrase_lower, re.IGNORECASE):
                    self.subject = subject
                    return True

        return False

    def extract_grade_context(self, grade: str, board: str = "CBSE") -> str:
        """
        Extract and format grade context.

        Example:
            grade="10", board="CBSE"
            → "Grade 10 CBSE"
        """
        if grade in GRADE_CONTEXT:
            self.grade = grade
            self.board = board
            return GRADE_CONTEXT[grade]

        # Fallback: construct manually
        self.grade = grade
        self.board = board
        return f"Grade {grade} {board}"

    def build_optimized_query(
        self,
        user_message: str,
        grade: str = "",
        board: str = "CBSE",
        include_sources: bool = True,
        include_visual_constraints: bool = True,
    ) -> str:
        """
        Build high-precision educational image search query.

        Strategy:
        1. Extract core topic
        2. Inject educational intent
        3. Apply visual constraints
        4. Contextualize grade
        5. Exclude noise
        6. Optionally scope to educational sources

        Example:
            Input: "Can you explain the human heart for my class 10 exam?"
            Output: "human heart labeled diagram infographic anatomy schematic Grade 10 CBSE
                     transparent background PNG -screenshot -logo -flag -photo
                     site:wikimedia.org OR site:britannica.com"
        """
        query_parts = []

        # Step 1: Extract core topic
        core_topic = self.extract_core_topic(user_message)
        if not core_topic:
            log.warning("Could not extract core topic from: %s", user_message)
            return user_message  # Fallback to original

        query_parts.append(core_topic)

        # Step 2: Inject educational intent
        # Select 2-3 most relevant educational keywords
        educational_keywords = self._select_relevant_keywords(
            core_topic, EDUCATIONAL_INTENT_KEYWORDS, count=3
        )
        query_parts.extend(educational_keywords)

        # Step 3: Apply visual constraints
        if include_visual_constraints:
            visual_keywords = self._select_relevant_keywords(
                core_topic, VISUAL_CONSTRAINT_KEYWORDS, count=2
            )
            query_parts.extend(visual_keywords)

        # Step 4: Contextualize grade
        if grade:
            grade_context = self.extract_grade_context(grade, board)
            query_parts.append(grade_context)

        # Step 5: Exclude noise
        query_parts.extend(NOISE_EXCLUSION_KEYWORDS)

        # Build base query
        base_query = " ".join(query_parts)

        # Step 6: Optionally scope to educational sources
        if include_sources:
            sources_query = " OR ".join(EDUCATIONAL_SOURCES)
            base_query = f"{base_query} ({sources_query})"

        log.debug("Optimized query: %s", base_query)
        return base_query

    def _select_relevant_keywords(
        self, core_topic: str, keyword_pool: List[str], count: int = 2
    ) -> List[str]:
        """
        Select most relevant keywords based on core topic.
        """
        core_lower = core_topic.lower()
        scored_keywords = []

        for keyword in keyword_pool:
            # Score based on relevance
            score = 0

            # Exact match
            if keyword.lower() in core_lower:
                score += 10

            # Partial match
            if any(word in core_lower for word in keyword.lower().split()):
                score += 5

            # Subject-specific match
            if self.subject:
                if self.subject in keyword.lower():
                    score += 3

            scored_keywords.append((keyword, score))

        # Sort by score and return top N
        scored_keywords.sort(key=lambda x: x[1], reverse=True)
        return [kw for kw, score in scored_keywords[:count]]

    def optimize_for_tier1(self, query: str) -> str:
        """
        Optimize query for Tier 1 (Bing Images) - school-level results.

        Adds:
        - Educational intent keywords
        - Grade context
        - Source scoping
        """
        # Add educational intent
        query = f"{query} labeled diagram infographic schematic"

        # Add source scoping
        query = f"{query} (site:wikimedia.org OR site:britannica.com)"

        return query

    def optimize_for_tier2(self, query: str) -> str:
        """
        Optimize query for Tier 2 (Wikipedia) - authoritative content.

        Adds:
        - Structural keywords
        - Educational context
        """
        query = f"{query} structure anatomy process diagram"
        return query

    def optimize_for_tier3(self, query: str) -> str:
        """
        Optimize query for Tier 3 (Commons) - diagrams and illustrations.

        Adds:
        - Diagram-specific keywords
        - Vector/SVG preference
        """
        query = f"{query} diagram illustration schematic SVG vector"
        return query

    def validate_image_quality(
        self, image_url: str, min_width: int = 500, min_height: int = 400
    ) -> bool:
        """
        Validate image quality based on dimensions.

        Ensures images aren't blurry thumbnails.
        """
        # This would require fetching image metadata
        # For now, we'll implement a basic check
        # In production, use PIL or similar to check actual dimensions

        # Reject common thumbnail patterns
        if any(
            pattern in image_url.lower()
            for pattern in ["thumb", "thumbnail", "small", "icon", "avatar"]
        ):
            return False

        return True

    def prioritize_asset_types(self, images: List[Dict]) -> List[Dict]:
        """
        Prioritize SVG and PNG (with transparency) for professional layout.

        Scoring:
        - SVG: +10 points
        - PNG: +5 points
        - JPG: +0 points
        - GIF: +2 points
        """
        scored_images = []

        for img in images:
            score = 0
            url = img.get("url", "").lower()

            # Check file type
            if url.endswith(".svg"):
                score += 10
            elif url.endswith(".png"):
                score += 5
            elif url.endswith(".gif"):
                score += 2
            elif url.endswith(".jpg") or url.endswith(".jpeg"):
                score += 0

            # Check for transparency indicators
            if "transparent" in url or "alpha" in url:
                score += 3

            # Check dimensions if available
            width = img.get("width", 0)
            height = img.get("height", 0)
            if width >= 500 and height >= 400:
                score += 5

            scored_images.append((img, score))

        # Sort by score
        scored_images.sort(key=lambda x: x[1], reverse=True)
        return [img for img, score in scored_images]


# ── Singleton Instance ──────────────────────────────────────────────────────
_optimizer = None


def get_query_optimizer() -> QueryOptimizer:
    """Get or create singleton QueryOptimizer instance."""
    global _optimizer
    if _optimizer is None:
        _optimizer = QueryOptimizer()
    return _optimizer


# ── Example Usage ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    optimizer = QueryOptimizer()

    # Test cases
    test_queries = [
        ("Can you explain the human heart for my class 10 exam?", "10", "CBSE"),
        ("What is photosynthesis?", "9", "CBSE"),
        ("Explain mitosis in detail", "11", "CBSE"),
        ("How does the water cycle work?", "6", "CBSE"),
        ("Tell me about Newton's laws of motion", "10", "CBSE"),
    ]

    print("=" * 80)
    print("QUERY OPTIMIZATION EXAMPLES")
    print("=" * 80)

    for user_message, grade, board in test_queries:
        print(f"\nInput: {user_message}")
        print(f"Grade: {grade}, Board: {board}")

        optimized = optimizer.build_optimized_query(user_message, grade, board)
        print(f"Optimized: {optimized}")
        print("-" * 80)
