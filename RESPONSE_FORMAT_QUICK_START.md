# VinAI Response Format - Quick Start Guide

## 5-Minute Overview

VinAI responses must follow a specific XML format with required fields. A validation system checks that responses meet quality standards.

## The Format (TL;DR)

```xml
<response>
  <subject>Specific topic</subject>
  <content>Main explanation</content>
  <hint>Nudge (early turns)</hint>
  <question>MCQ with 4 options, 1 correct</question>
  <exam_ready>Complete answer (turn 3+)</exam_ready>
  <media_query>2-5 word search phrase</media_query>
  <followups>At least 1 followup question</followups>
</response>
```

## What Gets Validated

| Check | What It Does |
|-------|-------------|
| **XML Structure** | Ensures valid XML with proper tags |
| **Required Fields** | Checks subject, content, media_query, followups exist |
| **Subject Specificity** | Rejects broad subjects like "Physics" |
| **Content Quality** | Checks for LaTeX symbols, word count, grade level |
| **Question Structure** | Validates 4 options, exactly 1 correct |
| **Exam-Ready Block** | Checks all sub-fields present (turn 3+) |
| **Followups** | Ensures 1-5 followup questions |
| **Media Query** | Validates 2-5 word search phrase |

## Using the Validators

### Backend (Python)
```python
from services.response_validator import VinAIResponseValidator

is_valid, errors = VinAIResponseValidator.validate_full_response(
    xml_response,
    turn_number=1,
    grade="9"
)

if not is_valid:
    print(f"Errors: {errors}")
```

### Frontend (JavaScript)
```javascript
import { ResponseValidator } from "../utils/responseValidator";

const validation = ResponseValidator.validateResponse(
  parsed,
  turnNumber,
  grade
);

if (!validation.isValid) {
  console.error(validation.errors);
}
```

## Development Mode

When running in development (`npm run dev`):
1. Responses show a validation debug panel
2. Panel shows ✓ Valid or ✗ Invalid status
3. Lists all errors and warnings
4. Shows which fields are present
5. Displays content preview

**To enable:** Just run in dev mode, it's automatic!

## Common Issues

### ❌ "Subject is too broad"
```xml
<subject>Physics</subject>  <!-- Bad -->
<subject>Newton's Third Law</subject>  <!-- Good -->
```

### ❌ "Content contains LaTeX symbols"
```xml
<content>Use $x^2$</content>  <!-- Bad -->
<content>Use x^2</content>  <!-- Good -->
```

### ❌ "Early turn content too long"
```xml
<!-- Bad: 500 words in turn 1 -->
<content>Long explanation...</content>

<!-- Good: 2-4 sentences -->
<content>Brief explanation here.</content>
```

### ❌ "Question must have exactly 1 correct answer"
```xml
<!-- Bad: 2 correct answers -->
<option correct="true">Answer A</option>
<option correct="true">Answer B</option>

<!-- Good: 1 correct answer -->
<option correct="true">Answer A</option>
<option correct="false">Answer B</option>
```

## Field Requirements by Turn

### Turn 1-2 (Socratic Mode)
```xml
<response>
  <subject>Specific topic</subject>
  <content>2-4 sentences max</content>
  <hint>Nudge toward answer</hint>
  <question>MCQ with 4 options</question>
  <media_query>2-5 words</media_query>
  <followups>1-5 questions</followups>
  <!-- NO exam_ready block -->
</response>
```

### Turn 3+ (Full Answer Mode)
```xml
<response>
  <subject>Specific topic</subject>
  <content>Detailed explanation</content>
  <exam_ready>
    <direct_answer>1-2 lines</direct_answer>
    <key_points>
      <point>Fact 1</point>
      <point>Fact 2</point>
    </key_points>
    <exam_format>Model answer</exam_format>
    <keywords>
      <keyword>Term 1</keyword>
      <keyword>Term 2</keyword>
    </keywords>
    <real_life_example>Analogy</real_life_example>
  </exam_ready>
  <media_query>2-5 words</media_query>
  <followups>1-5 questions</followups>
  <!-- NO hint or question blocks -->
</response>
```

## Quality Checklist

Before sending a response, verify:

- [ ] Valid XML (no syntax errors)
- [ ] Subject is specific (not "Physics", use "Newton's Third Law")
- [ ] Content has no LaTeX symbols (`$`, `\`)
- [ ] Early turns are 2-4 sentences (< 200 words)
- [ ] Questions have exactly 4 options
- [ ] Exactly 1 option is marked `correct="true"`
- [ ] Exam-ready block has all 5 sub-fields (if turn 3+)
- [ ] At least 1 followup question
- [ ] Media query is 2-5 words
- [ ] Language matches student grade level

## Testing Your Response

### Quick Test
```bash
# In Python
python -c "
from services.response_validator import VinAIResponseValidator
xml = '<response>...</response>'
is_valid, errors = VinAIResponseValidator.validate_full_response(xml)
print('Valid' if is_valid else f'Errors: {errors}')
"
```

### Visual Test
1. Run `npm run dev` in frontend
2. Start a chat in VinAI
3. Look for validation debug panel below response
4. Check for ✓ Valid or ✗ Invalid status

## Grade-Based Language

### Classes 5-8 (Junior)
- ✓ Simple language, everyday examples
- ✓ Basic concepts, simple formulas
- ✗ Avoid: differential, integral, quantum

### Classes 9-12 (Senior)
- ✓ Technical terminology, detailed explanations
- ✓ Derivations, multiple solution methods
- ✗ Avoid: oversimplification

## Files to Know

| File | Purpose |
|------|---------|
| `backend/services/response_validator.py` | Backend validator |
| `frontend/src/utils/responseValidator.js` | Frontend validator |
| `frontend/src/components/ResponseValidationDebug.jsx` | Debug panel |
| `backend/routers/vin_ai.py` | System prompt (build_system_prompt) |
| `frontend/src/utils/xmlParser.js` | XML parser |

## Getting Help

1. **Quick reference:** See `RESPONSE_FORMAT_CHECKLIST.md`
2. **Detailed guide:** See `RESPONSE_FORMAT_VERIFICATION_GUIDE.md`
3. **Implementation details:** See `RESPONSE_FORMAT_IMPLEMENTATION_SUMMARY.md`
4. **System prompt:** See `backend/routers/vin_ai.py` → `build_system_prompt()`

## Common Patterns

### Good Subject Examples
- "Linear Equations"
- "Photosynthesis"
- "Newton's Third Law"
- "Quadratic Formula"
- "Mitochondrial Function"
- "Photosynthesis Process"
- "Electromagnetic Induction"

### Good Content Examples
- Early turn: "A linear equation is an equation where the highest power of the variable is 1. Let's think about what that means."
- Later turn: "A linear equation can be solved by isolating the variable. Here's the step-by-step process..."

### Good Question Examples
```xml
<question>
  What is the solution to 2x + 3 = 7?
  <option correct="false">1</option>
  <option correct="true">2</option>
  <option correct="false">3</option>
  <option correct="false">4</option>
</question>
```

### Good Media Query Examples
- "linear equations solving"
- "photosynthesis process plants"
- "newton third law examples"
- "quadratic formula derivation"

## Troubleshooting

### Response shows ✗ Invalid
1. Check XML syntax (all tags closed?)
2. Check required fields (subject, content, media_query, followups?)
3. Check subject specificity (not broad?)
4. Check content (no LaTeX symbols?)
5. See error messages in debug panel

### Response shows ⚠️ Warnings
1. Check grade-appropriate language
2. Review content for overly complex terms
3. Verify field presence

### Debug panel not showing
1. Make sure you're in dev mode (`npm run dev`)
2. Check browser console for errors
3. Verify response is complete (streaming finished)

## Next Steps

1. **Read the full guide:** `RESPONSE_FORMAT_VERIFICATION_GUIDE.md`
2. **Test a response:** Use the validators
3. **Check the checklist:** `RESPONSE_FORMAT_CHECKLIST.md`
4. **Review system prompt:** `backend/routers/vin_ai.py`

## Key Takeaways

✓ Responses must be valid XML
✓ All required fields must be present
✓ Subject must be specific (not broad)
✓ Content must be grade-appropriate
✓ No LaTeX symbols allowed
✓ Early turns are concise, later turns are detailed
✓ Questions have 4 options, 1 correct
✓ Exam-ready blocks are complete
✓ Validation runs automatically in dev mode
✓ Errors are logged for monitoring

---

**Questions?** Check the full documentation or review the validator code.
