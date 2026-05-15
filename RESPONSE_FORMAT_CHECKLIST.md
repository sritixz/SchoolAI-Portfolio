# VinAI Response Format Quick Checklist

## Pre-Response Checklist (For LLM System Prompt)

### Structure
- [ ] Response is valid XML with `<response>` root element
- [ ] All tags are properly closed
- [ ] No text outside `<response>` tags

### Always Required Fields
- [ ] `<subject>` - Specific topic (not broad subject like "Physics")
- [ ] `<content>` - Main explanation (2-4 sentences for early turns)
- [ ] `<media_query>` - 2-5 word search phrase
- [ ] `<followups>` - At least 1 followup question

### Early Turns (1-2)
- [ ] `<hint>` - Nudge toward answer (NOT full solution)
- [ ] `<question>` - Practice MCQ with exactly 4 options
- [ ] Exactly 1 option marked `correct="true"`
- [ ] NO `<exam_ready>` block

### Later Turns (3+) or When Requested
- [ ] `<exam_ready>` block with all sub-fields:
  - [ ] `<direct_answer>` - 1-2 line answer
  - [ ] `<key_points>` - At least 2 points
  - [ ] `<exam_format>` - Model exam answer
  - [ ] `<keywords>` - At least 2 keywords
  - [ ] `<real_life_example>` - Relatable analogy

### Content Quality
- [ ] ✓ No LaTeX symbols (`$`, `\`, etc.)
- [ ] ✓ Formulas in plain text: `x^2`, `sqrt()`, `CO2`
- [ ] ✓ No broken symbols or unwanted characters
- [ ] ✓ Clean, readable output
- [ ] ✓ Grade-appropriate language
- [ ] ✓ Early turns concise (< 200 words)

### Subject Specificity
- [ ] ✓ Specific topic (e.g., "Linear Equations")
- [ ] ✗ NOT broad (e.g., "Mathematics")
- [ ] ✓ At least 2 words or 15 characters
- [ ] ✓ Clear and descriptive

### Question Quality (if included)
- [ ] ✓ Clear question text
- [ ] ✓ Exactly 4 options
- [ ] ✓ Exactly 1 correct answer
- [ ] ✓ Plausible wrong answers
- [ ] ✓ Tests the concept

### Exam-Ready Quality (if included)
- [ ] ✓ Direct answer is concise (1-2 lines)
- [ ] ✓ Key points are specific facts
- [ ] ✓ Exam format is suitable for writing
- [ ] ✓ Keywords are important terms
- [ ] ✓ Real-life example is relatable

### Followups Quality
- [ ] ✓ Natural progression from current topic
- [ ] ✓ At least 1 followup
- [ ] ✓ At most 5 followups
- [ ] ✓ Clear, understandable phrasing

### Media Query Quality
- [ ] ✓ 2-5 words
- [ ] ✓ Searchable terms
- [ ] ✓ Related to current concept

---

## Post-Response Checklist (For Validation)

### Automated Validation (Backend)
```python
from services.response_validator import VinAIResponseValidator

is_valid, errors = VinAIResponseValidator.validate_full_response(
    xml_response,
    turn_number=1,
    grade="9"
)
```

- [ ] XML structure valid
- [ ] All required fields present
- [ ] Subject is specific
- [ ] No LaTeX symbols
- [ ] Content quality acceptable
- [ ] Question structure correct (if present)
- [ ] Exam-ready complete (if present)
- [ ] Followups present
- [ ] Media query format correct
- [ ] Grade-appropriate language

### Manual Verification (Frontend)
- [ ] Response displays correctly in UI
- [ ] Hint block shows (early turns)
- [ ] Question renders with 4 options (early turns)
- [ ] Exam-ready block shows (later turns)
- [ ] Followup buttons appear
- [ ] Media recommendations load
- [ ] No formatting issues or broken HTML

### Development Mode Debug
- [ ] Open ResponseValidationDebug panel
- [ ] Check validation status (✓ or ✗)
- [ ] Review any errors
- [ ] Review any warnings
- [ ] Verify all fields present
- [ ] Check content preview

---

## Common Mistakes to Avoid

### ❌ Subject Issues
- "Physics" → ✓ "Newton's Third Law"
- "Math" → ✓ "Quadratic Equations"
- "Science" → ✓ "Photosynthesis"

### ❌ Content Issues
- `$x^2$` → ✓ `x^2`
- `\sqrt{4}` → ✓ `sqrt(4)`
- 500 words in turn 1 → ✓ 2-4 sentences
- No explanation → ✓ Meaningful content

### ❌ Question Issues
- 3 options → ✓ 4 options
- 2 correct answers → ✓ 1 correct answer
- Empty question text → ✓ Clear question
- No options → ✓ 4 options

### ❌ Exam-Ready Issues
- Missing sub-fields → ✓ All 5 sub-fields present
- 0 key points → ✓ At least 2 key points
- 0 keywords → ✓ At least 2 keywords
- Empty fields → ✓ All fields filled

### ❌ Followups Issues
- 0 followups → ✓ At least 1
- 10 followups → ✓ At most 5
- Unrelated questions → ✓ Natural progression
- Empty followup text → ✓ Clear questions

### ❌ Media Query Issues
- "photosynthesis" (1 word) → ✓ "photosynthesis process plants" (3 words)
- "photosynthesis in plants with chlorophyll and light" (7 words) → ✓ "photosynthesis plants light" (3 words)
- Empty query → ✓ 2-5 word phrase

---

## Validation Status Codes

### ✓ Valid Response
- All required fields present
- No errors detected
- Ready to send to student

### ⚠️ Valid with Warnings
- All required fields present
- Minor issues detected (e.g., grade-inappropriate language)
- Can send but should review

### ✗ Invalid Response
- Missing required fields
- Structural errors
- Quality issues
- **DO NOT SEND** - Fix and regenerate

---

## Quick Reference: Field Presence by Turn

| Field | Turn 1-2 | Turn 3+ | Always |
|-------|----------|---------|--------|
| subject | ✓ | ✓ | ✓ |
| content | ✓ | ✓ | ✓ |
| hint | ✓ | ✗ | - |
| steps | ✓ | ✓ | - |
| question | ✓ | ✗ | - |
| exam_ready | ✗ | ✓ | - |
| media_query | ✓ | ✓ | ✓ |
| followups | ✓ | ✓ | ✓ |

---

## Testing Commands

### Backend Validation
```bash
# Run validator on sample response
python -c "
from services.response_validator import validate_and_log_response
xml = '<response>...</response>'
report = validate_and_log_response(xml, turn_number=1, grade='9')
print(report)
"
```

### Frontend Validation
```javascript
// In browser console
import { ResponseValidator } from './utils/responseValidator.js';
const validation = ResponseValidator.validateResponse(parsed, 1, '9');
console.log(validation);
```

---

## Integration Checklist

### Backend
- [ ] Import `response_validator.py` in `vin_ai.py`
- [ ] Call validator after LLM response
- [ ] Log validation results
- [ ] Handle validation failures

### Frontend
- [ ] Import `ResponseValidator` in `VinAI.jsx`
- [ ] Import `ResponseValidationDebug` component
- [ ] Add debug panel to `StreamingMessage`
- [ ] Display validation results in dev mode

### Monitoring
- [ ] Set up logging for validation failures
- [ ] Create alerts for invalid responses
- [ ] Track validation metrics over time
- [ ] Review and iterate system prompt

---

## Resources

- **Full Guide:** `RESPONSE_FORMAT_VERIFICATION_GUIDE.md`
- **Backend Validator:** `backend/services/response_validator.py`
- **Frontend Validator:** `frontend/src/utils/responseValidator.js`
- **Debug Component:** `frontend/src/components/ResponseValidationDebug.jsx`
- **System Prompt:** `backend/routers/vin_ai.py` → `build_system_prompt()`
- **XML Parser:** `frontend/src/utils/xmlParser.js` → `parseVinXML()`
