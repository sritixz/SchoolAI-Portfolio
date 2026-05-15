/**
 * Incremental XML parser for Vin AI streaming responses.
 * Parses XML tags as they arrive and extracts structured blocks.
 *
 * Design notes:
 * - sanitizeHtmlTags only runs on COMPLETED content (when the closing tag is present)
 *   to avoid stripping valid tags that haven't arrived yet during streaming.
 * - All regex extractions use /s (dotAll) flag to handle multi-line content.
 */

/**
 * Strips orphan closing HTML tags from a COMPLETED string.
 * Only call this after the full content has been received.
 */
function sanitizeHtmlTags(content) {
  if (!content) return content;

  // Count opens vs closes for each tag name and remove excess closing tags
  const tagCounts = {};
  // First pass: count all opening tags
  for (const [, tagName] of content.matchAll(/<([a-z][a-z0-9]*)[^>/]*>/gi)) {
    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
  }

  // Second pass: remove closing tags that exceed their opening count
  const closeCounts = {};
  return content.replace(/<\/([a-z][a-z0-9]*)[^>]*>/gi, (match, tagName) => {
    closeCounts[tagName] = (closeCounts[tagName] || 0) + 1;
    const opens = tagCounts[tagName] || 0;
    if (closeCounts[tagName] > opens) {
      return ""; // orphan — remove it
    }
    return match;
  });
}

/**
 * Extract content between two XML tags, handling streaming (incomplete) state.
 * Returns { text, complete } where complete=true means the closing tag was found.
 */
function extractTag(buffer, tag) {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  const openIdx = buffer.indexOf(openTag);
  if (openIdx === -1) return { text: null, complete: false };

  const start = openIdx + openTag.length;
  const closeIdx = buffer.indexOf(closeTag, start);

  if (closeIdx !== -1) {
    return { text: buffer.slice(start, closeIdx).trim(), complete: true };
  }
  // Still streaming — return what we have, strip any trailing incomplete tag
  const partial = buffer.slice(start).replace(/<[^>]*$/, "").trim();
  return { text: partial, complete: false };
}

export function parseVinXML(xmlBuffer) {
  const result = {
    subject: null,
    content: "",
    hint: null,
    steps: [],
    question: null,
    followups: [],
    examReady: null,
    mediaQuery: null,
    complete: false,
  };

  // Only parse content inside <response>...</response> to ignore any LLM preamble
  const responseStart = xmlBuffer.indexOf("<response>");
  const workingBuffer = responseStart !== -1 ? xmlBuffer.slice(responseStart) : xmlBuffer;

  // Subject (always complete before content starts)
  const subjectMatch = workingBuffer.match(/<subject>(.*?)<\/subject>/s);
  if (subjectMatch) result.subject = subjectMatch[1].trim();

  // Content — use LAST occurrence to handle rare duplicate tags from the LLM
  const lastContentOpen = workingBuffer.lastIndexOf("<content>");
  if (lastContentOpen !== -1) {
    const start = lastContentOpen + 9;
    const closeIdx = workingBuffer.indexOf("</content>", start);
    if (closeIdx !== -1) {
      // Complete — safe to sanitize
      result.content = sanitizeHtmlTags(workingBuffer.slice(start, closeIdx).trim());
    } else {
      // Still streaming — don't sanitize, just strip trailing incomplete tag
      result.content = workingBuffer.slice(start).replace(/<[^>]*$/, "").trim();
    }
  }

  // Hint — only show when complete to avoid partial renders
  const hintMatch = workingBuffer.match(/<hint>(.*?)<\/hint>/s);
  if (hintMatch) result.hint = sanitizeHtmlTags(hintMatch[1].trim());

  // Steps — only parse complete <steps> block
  const stepsMatch = workingBuffer.match(/<steps>(.*?)<\/steps>/s);
  if (stepsMatch) {
    const stepMatches = [...stepsMatch[1].matchAll(/<step number="(\d+)">(.*?)<\/step>/gs)];
    result.steps = stepMatches.map((m) => ({
      number: parseInt(m[1]),
      text: sanitizeHtmlTags(m[2].trim()),
    }));
  }

  // Question — only parse complete <question> block
  const questionMatch = workingBuffer.match(/<question>(.*?)<\/question>/s);
  if (questionMatch) {
    const qText = questionMatch[1];
    const optionMatches = [...qText.matchAll(/<option correct="(true|false)">(.*?)<\/option>/gs)];
    if (optionMatches.length > 0) {
      const questionText = qText.replace(/<option[\s\S]*?<\/option>/gs, "").trim();
      result.question = {
        text: sanitizeHtmlTags(questionText),
        options: optionMatches.map((m, i) => ({
          id: String.fromCharCode(65 + i),
          text: m[2].trim(),
          correct: m[1] === "true",
        })),
      };
    }
  }

  // Exam ready — only parse complete block
  const examReadyMatch = workingBuffer.match(/<exam_ready>(.*?)<\/exam_ready>/s);
  if (examReadyMatch) {
    const er = examReadyMatch[1];
    const directAnswer = er.match(/<direct_answer>(.*?)<\/direct_answer>/s)?.[1]?.trim() || null;
    const examFormat = er.match(/<exam_format>(.*?)<\/exam_format>/s)?.[1]?.trim() || null;
    const realLifeExample = er.match(/<real_life_example>(.*?)<\/real_life_example>/s)?.[1]?.trim() || null;
    const keyPoints = [...er.matchAll(/<point>(.*?)<\/point>/gs)].map((m) =>
      sanitizeHtmlTags(m[1].trim())
    );
    const keywords = [...er.matchAll(/<keyword>(.*?)<\/keyword>/gs)].map((m) => m[1].trim());

    result.examReady = {
      directAnswer: sanitizeHtmlTags(directAnswer),
      keyPoints,
      examFormat: sanitizeHtmlTags(examFormat),
      keywords,
      realLifeExample: sanitizeHtmlTags(realLifeExample),
    };
  }

  // Followups — only parse complete block
  const followupsMatch = workingBuffer.match(/<followups>(.*?)<\/followups>/s);
  if (followupsMatch) {
    result.followups = [...followupsMatch[1].matchAll(/<followup>(.*?)<\/followup>/gs)].map((m) =>
      m[1].trim()
    );
  }

  // Media query
  const mediaQueryMatch = workingBuffer.match(/<media_query>(.*?)<\/media_query>/s);
  if (mediaQueryMatch) result.mediaQuery = mediaQueryMatch[1].trim();

  result.complete = workingBuffer.includes("</response>");

  return result;
}

/**
 * Extract plain text preview from content (strip HTML tags)
 */
export function getContentPreview(content, maxLength = 120) {
  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLength ? plain.slice(0, maxLength) + "..." : plain;
}
