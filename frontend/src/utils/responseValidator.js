/**
 * Frontend response format validator for VinAI.
 * Validates responses match the required format and quality standards.
 */

export class ResponseValidator {
  static REQUIRED_FIELDS = ["subject", "content", "followups", "media_query"];
  static EARLY_TURN_FIELDS = ["hint", "question"];
  static FINAL_TURN_FIELDS = ["exam_ready"];

  /**
   * Validate complete response structure
   * @param {Object} parsed - Parsed XML response from parseVinXML
   * @param {number} turnNumber - Current turn (1, 2, 3+)
   * @param {string} grade - Student grade for context
   * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
   */
  static validateResponse(parsed, turnNumber = 1, grade = "") {
    const errors = [];
    const warnings = [];

    // 1. Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!parsed[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 2. Validate subject specificity
    if (parsed.subject) {
      const subjectError = this.validateSubjectSpecificity(parsed.subject);
      if (subjectError) errors.push(subjectError);
    }

    // 3. Validate content
    if (parsed.content) {
      const contentErrors = this.validateContent(parsed.content, turnNumber);
      errors.push(...contentErrors);
    }

    // 4. Validate question structure (early turns)
    if (turnNumber <= 2 && parsed.question) {
      const qError = this.validateQuestion(parsed.question);
      if (qError) errors.push(qError);
    }

    // 5. Validate exam_ready (later turns)
    if (turnNumber >= 3 && parsed.examReady) {
      const erError = this.validateExamReady(parsed.examReady);
      if (erError) errors.push(...erError);
    }

    // 6. Validate followups
    if (parsed.followups && parsed.followups.length === 0) {
      errors.push("No followup questions provided");
    }

    // 7. Validate media_query
    if (parsed.mediaQuery) {
      const mqError = this.validateMediaQuery(parsed.mediaQuery);
      if (mqError) errors.push(mqError);
    }

    // 8. Grade-based validation
    if (grade) {
      const gradeWarnings = this.validateGradeAdaptation(parsed, grade);
      warnings.push(...gradeWarnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      errorCount: errors.length,
      warningCount: warnings.length,
    };
  }

  /**
   * Validate subject is specific, not broad
   */
  static validateSubjectSpecificity(subject) {
    const broadSubjects = [
      "physics", "chemistry", "biology", "mathematics", "math",
      "science", "english", "history", "geography", "general",
      "social studies", "economics", "civics", "computer science"
    ];

    const subjectLower = subject.toLowerCase().trim();
    if (broadSubjects.includes(subjectLower)) {
      return `Subject "${subject}" is too broad. Use specific topic (e.g., "Linear Equations" not "Mathematics")`;
    }

    const words = subject.split(/\s+/).length;
    if (words < 2 && subject.length < 15) {
      return `Subject "${subject}" is too vague. Be more specific.`;
    }

    return null;
  }

  /**
   * Validate content quality
   */
  static validateContent(content, turnNumber) {
    const errors = [];

    // Remove HTML tags for word count
    const clean = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = clean.split(/\s+/).length;

    if (turnNumber <= 2) {
      if (wordCount > 200) {
        errors.push(`Early turn content too long (${wordCount} words). Keep to 2-4 sentences max.`);
      }
    }

    if (wordCount < 10) {
      errors.push("Content is too short. Provide meaningful explanation.");
    }

    return errors;
  }

  /**
   * Validate practice question structure
   */
  static validateQuestion(question) {
    if (!question.text || question.text.trim().length === 0) {
      return "Question text is empty";
    }

    if (!question.options || question.options.length < 2) {
      return "Question must have at least 2 options";
    }

    if (question.options.length > 5) {
      return "Question should have at most 5 options";
    }

    const correctCount = question.options.filter(o => o.correct).length;
    if (correctCount !== 1) {
      return `Question must have exactly 1 correct answer (found ${correctCount})`;
    }

    return null;
  }

  /**
   * Validate exam_ready block
   */
  static validateExamReady(examReady) {
    const errors = [];

    if (!examReady.directAnswer || examReady.directAnswer.trim().length === 0) {
      errors.push("exam_ready: directAnswer is empty");
    }

    if (!examReady.keyPoints || examReady.keyPoints.length < 2) {
      errors.push("exam_ready: Must have at least 2 key points");
    }

    if (!examReady.examFormat || examReady.examFormat.trim().length === 0) {
      errors.push("exam_ready: examFormat is empty");
    }

    if (!examReady.keywords || examReady.keywords.length < 2) {
      errors.push("exam_ready: Must have at least 2 keywords");
    }

    return errors;
  }

  /**
   * Validate media_query is concise
   */
  static validateMediaQuery(mediaQuery) {
    const words = mediaQuery.split(/\s+/).length;
    if (words < 2) {
      return "media_query must be at least 2 words";
    }
    if (words > 5) {
      return "media_query should be at most 5 words";
    }
    return null;
  }

  /**
   * Validate grade-appropriate language
   */
  static validateGradeAdaptation(parsed, grade) {
    const warnings = [];
    const content = (parsed.content || "").toLowerCase();

    // For junior grades (5-8), check for overly complex language
    if (["5", "6", "7", "8"].includes(grade)) {
      const complexTerms = [
        "differential", "integral", "derivative", "quantum",
        "thermodynamic", "electrochemistry", "stoichiometry"
      ];
      for (const term of complexTerms) {
        if (content.includes(term)) {
          warnings.push(`⚠️ Content uses advanced term "${term}" - may be too complex for Class ${grade}`);
        }
      }
    }

    return warnings;
  }

  /**
   * Get human-readable validation report
   */
  static getReport(validation) {
    let report = "";

    if (validation.isValid) {
      report = "✅ Response format is valid\n";
    } else {
      report = `❌ Response has ${validation.errorCount} error(s):\n`;
      validation.errors.forEach(err => {
        report += `  • ${err}\n`;
      });
    }

    if (validation.warnings.length > 0) {
      report += `\n⚠️ ${validation.warnings.length} warning(s):\n`;
      validation.warnings.forEach(warn => {
        report += `  • ${warn}\n`;
      });
    }

    return report;
  }
}

/**
 * Hook to validate responses in real-time
 * Usage: const validation = useResponseValidation(parsed, turnNumber, grade);
 */
export function useResponseValidation(parsed, turnNumber = 1, grade = "") {
  return ResponseValidator.validateResponse(parsed, turnNumber, grade);
}
