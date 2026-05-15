"""
Response format validator for VinAI LLM responses.
Ensures all responses follow the required XML structure and content guidelines.
"""
import re
from typing import Dict, List, Optional, Tuple
from xml.etree import ElementTree as ET


class ResponseValidationError(Exception):
    """Raised when response validation fails."""
    pass


class VinAIResponseValidator:
    """Validates VinAI LLM responses against required format."""

    # Required fields that must always be present
    REQUIRED_FIELDS = ["subject", "content", "followups", "media_query"]
    
    # Conditional fields based on turn number
    EARLY_TURN_FIELDS = {"hint", "question"}  # Turns 1-2
    FINAL_TURN_FIELDS = {"exam_ready"}  # Turn 3+
    
    # Regex patterns for validation
    LATEX_PATTERN = re.compile(r'\$|\\[a-zA-Z]+|\\[()[\]{}]')
    UNWANTED_SYMBOLS = re.compile(r'[^\w\s\-.,;:!?()\'"&/+=<>]')
    
    @staticmethod
    def validate_xml_structure(xml_str: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that response is valid XML with required structure.
        Returns (is_valid, error_message)
        """
        try:
            root = ET.fromstring(xml_str)
            if root.tag != "response":
                return False, "Root element must be <response>"
            return True, None
        except ET.ParseError as e:
            return False, f"Invalid XML: {str(e)}"
    
    @staticmethod
    def validate_required_fields(root: ET.Element) -> Tuple[bool, List[str]]:
        """Validate that all required fields are present and non-empty. Returns all missing fields."""
        # Fields that contain text directly
        TEXT_FIELDS = {"subject", "content", "media_query"}
        # Fields that are containers (have child elements, not direct text)
        CONTAINER_FIELDS = {"followups"}

        field_errors = []
        for field in VinAIResponseValidator.REQUIRED_FIELDS:
            elem = root.find(field)
            if elem is None:
                field_errors.append(f"Missing required field: <{field}>")
            elif field in TEXT_FIELDS:
                if not elem.text or not elem.text.strip():
                    field_errors.append(f"Required field <{field}> is empty")
            elif field in CONTAINER_FIELDS:
                if len(list(elem)) == 0:
                    field_errors.append(f"Required field <{field}> has no children")
        return len(field_errors) == 0, field_errors
    
    @staticmethod
    def validate_subject_specificity(subject: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that subject is specific (not broad).
        Good: "Linear Equations", "Photosynthesis", "Newton's Third Law"
        Bad: "Physics", "Mathematics", "Science"
        """
        broad_subjects = {
            "physics", "chemistry", "biology", "mathematics", "math",
            "science", "english", "history", "geography", "general",
            "social studies", "economics", "civics", "computer science"
        }
        
        subject_lower = subject.lower().strip()
        if subject_lower in broad_subjects:
            return False, f"Subject '{subject}' is too broad. Use specific topic (e.g., 'Linear Equations' not 'Mathematics')"
        
        # Check minimum specificity (at least 2 words or 15 chars)
        if len(subject.split()) < 2 and len(subject) < 15:
            return False, f"Subject '{subject}' is too vague. Be more specific."
        
        return True, None
    
    @staticmethod
    def validate_no_latex(text: str) -> Tuple[bool, Optional[str]]:
        """LaTeX is now supported and rendered via KaTeX — no longer rejected."""
        return True, None
    
    @staticmethod
    def validate_content_quality(content: str, turn_number: int = 1) -> Tuple[bool, Optional[str]]:
        """
        Validate content quality based on turn number.
        Early turns (1-2): Should be concise (2-4 sentences)
        Later turns: Can be longer
        """
        # Remove HTML tags for word count
        clean = re.sub(r'<[^>]+>', '', content)
        word_count = len(clean.split())
        
        if turn_number <= 2:
            # Early turns should be concise
            if word_count > 200:
                return False, f"Early turn content too long ({word_count} words). Keep to 2-4 sentences max."
        
        if word_count < 10:
            return False, "Content is too short. Provide meaningful explanation."
        
        return True, None
    
    @staticmethod
    def validate_question_structure(question_elem: Optional[ET.Element]) -> Tuple[bool, Optional[str]]:
        """Validate practice question has proper structure."""
        if question_elem is None:
            return True, None  # Optional in later turns
        
        # Check for question text
        question_text = question_elem.text or ""
        if not question_text.strip():
            return False, "Question text is empty"
        
        # Check for options
        options = question_elem.findall("option")
        if len(options) < 2:
            return False, "Question must have at least 2 options"
        if len(options) > 5:
            return False, "Question should have at most 5 options"
        
        # Check that exactly one option is correct
        correct_count = sum(1 for opt in options if opt.get("correct") == "true")
        if correct_count != 1:
            return False, f"Question must have exactly 1 correct answer (found {correct_count})"
        
        return True, None
    
    @staticmethod
    def validate_exam_ready_structure(exam_ready_elem: Optional[ET.Element]) -> Tuple[bool, Optional[str]]:
        """Validate exam_ready block has required sub-elements."""
        if exam_ready_elem is None:
            return True, None  # Optional in early turns
        
        required_subfields = {"direct_answer", "key_points", "exam_format", "keywords"}
        for subfield in required_subfields:
            elem = exam_ready_elem.find(subfield)
            if elem is None:
                return False, f"<exam_ready> missing required field: <{subfield}>"
        
        # Validate key_points has at least 2 points
        key_points = exam_ready_elem.find("key_points")
        if key_points is not None:
            points = key_points.findall("point")
            if len(points) < 2:
                return False, "<key_points> must have at least 2 points"
        
        # Validate keywords has at least 2 keywords
        keywords = exam_ready_elem.find("keywords")
        if keywords is not None:
            kws = keywords.findall("keyword")
            if len(kws) < 2:
                return False, "<keywords> must have at least 2 keywords"
        
        return True, None
    
    @staticmethod
    def validate_followups(followups_elem: Optional[ET.Element]) -> Tuple[bool, Optional[str]]:
        """Validate followups block."""
        if followups_elem is None:
            return False, "Missing required <followups> block"
        
        followups = followups_elem.findall("followup")
        if len(followups) < 1:
            return False, "<followups> must have at least 1 followup question"
        if len(followups) > 5:
            return False, "<followups> should have at most 5 followup questions"
        
        for fu in followups:
            if not fu.text or not fu.text.strip():
                return False, "Followup question is empty"
        
        return True, None
    
    @staticmethod
    def validate_media_query(media_query: str) -> Tuple[bool, Optional[str]]:
        """Validate media_query is concise and searchable."""
        words = media_query.split()
        if len(words) < 2:
            return False, "media_query must be at least 2 words"
        if len(words) > 5:
            return False, "media_query should be at most 5 words"
        return True, None
    
    @classmethod
    def validate_full_response(
        cls,
        xml_str: str,
        turn_number: int = 1,
        grade: str = "",
    ) -> Tuple[bool, List[str]]:
        """
        Comprehensive validation of entire response.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        
        # 1. Validate XML structure
        is_valid, error = cls.validate_xml_structure(xml_str)
        if not is_valid:
            return False, [error]
        
        try:
            root = ET.fromstring(xml_str)
        except ET.ParseError as e:
            return False, [f"XML Parse Error: {str(e)}"]
        
        # 2. Validate required fields
        is_valid, field_errors = cls.validate_required_fields(root)
        if not is_valid:
            errors.extend(field_errors)
        
        # 3. Validate subject specificity
        subject_elem = root.find("subject")
        if subject_elem is not None and subject_elem.text:
            is_valid, error = cls.validate_subject_specificity(subject_elem.text)
            if not is_valid:
                errors.append(error)
        
        # 4. Validate content quality
        content_elem = root.find("content")
        if content_elem is not None and content_elem.text:
            is_valid, error = cls.validate_no_latex(content_elem.text)
            if not is_valid:
                errors.append(error)
            
            is_valid, error = cls.validate_content_quality(content_elem.text, turn_number)
            if not is_valid:
                errors.append(error)
        
        # 5. Validate question structure (if present)
        question_elem = root.find("question")
        is_valid, error = cls.validate_question_structure(question_elem)
        if not is_valid:
            errors.append(error)
        
        # 6. Validate exam_ready structure (if present)
        exam_ready_elem = root.find("exam_ready")
        is_valid, error = cls.validate_exam_ready_structure(exam_ready_elem)
        if not is_valid:
            errors.append(error)
        
        # 7. Validate followups
        followups_elem = root.find("followups")
        is_valid, error = cls.validate_followups(followups_elem)
        if not is_valid:
            errors.append(error)
        
        # 8. Validate media_query
        media_query_elem = root.find("media_query")
        if media_query_elem is not None and media_query_elem.text:
            is_valid, error = cls.validate_media_query(media_query_elem.text)
            if not is_valid:
                errors.append(error)
        
        # 9. Grade-based validation
        if grade:
            is_valid, error = cls.validate_grade_adaptation(root, grade)
            if not is_valid:
                errors.append(error)
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_grade_adaptation(root: ET.Element, grade: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that response is appropriately adapted for grade level.
        This is a heuristic check - not perfect but catches obvious issues.
        """
        content_elem = root.find("content")
        if content_elem is None or not content_elem.text:
            return True, None
        
        content = content_elem.text.lower()
        
        # For junior grades (5-8), check for overly complex language
        if grade in ["5", "6", "7", "8"]:
            complex_terms = [
                "differential", "integral", "derivative", "quantum",
                "thermodynamic", "electrochemistry", "stoichiometry"
            ]
            for term in complex_terms:
                if term in content:
                    return False, f"Content uses advanced term '{term}' inappropriate for Class {grade}"
        
        # For senior grades (9-12), check that technical terms are used appropriately
        if grade in ["9", "10", "11", "12"]:
            # Should have some technical depth
            pass  # Could add checks here
        
        return True, None


def validate_and_log_response(xml_str: str, turn_number: int = 1, grade: str = "") -> Dict:
    """
    Validate response and return detailed report.
    Useful for debugging and monitoring response quality.
    """
    is_valid, errors = VinAIResponseValidator.validate_full_response(
        xml_str, turn_number, grade
    )
    
    return {
        "is_valid": is_valid,
        "errors": errors,
        "turn_number": turn_number,
        "grade": grade,
        "error_count": len(errors),
    }
