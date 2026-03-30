/**
 * Incremental XML parser for Vin AI streaming responses.
 * Parses XML tags as they arrive and extracts structured blocks.
 */

export function parseVinXML(xmlBuffer) {
  const result = {
    subject: null,
    content: "",
    hint: null,
    steps: [],
    question: null,
    followups: [],
    complete: false,
  };

  // Extract subject
  const subjectMatch = xmlBuffer.match(/<subject>(.*?)<\/subject>/s);
  if (subjectMatch) result.subject = subjectMatch[1].trim();

  // Extract content (may be incomplete during streaming — grab everything after <content> until </content> or end of buffer)
  const contentOpen = xmlBuffer.indexOf("<content>");
  if (contentOpen !== -1) {
    const contentStart = contentOpen + 9; // length of "<content>"
    const contentClose = xmlBuffer.indexOf("</content>");
    result.content = contentClose !== -1
      ? xmlBuffer.slice(contentStart, contentClose).trim()
      : xmlBuffer.slice(contentStart).replace(/<[^>]*$/, "").trim(); // strip any incomplete tag at end
  }

  // Extract hint (only when complete)
  const hintMatch = xmlBuffer.match(/<hint>(.*?)<\/hint>/s);
  if (hintMatch) result.hint = hintMatch[1].trim();

  // Extract steps
  const stepsMatch = xmlBuffer.match(/<steps>(.*?)<\/steps>/s);
  if (stepsMatch) {
    const stepMatches = [...stepsMatch[1].matchAll(/<step number="(\d+)">(.*?)<\/step>/gs)];
    result.steps = stepMatches.map(m => ({
      number: parseInt(m[1]),
      text: m[2].trim(),
    }));
  }

  // Extract question with options
  const questionMatch = xmlBuffer.match(/<question>(.*?)<\/question>/s);
  if (questionMatch) {
    const qText = questionMatch[1];
    const optionMatches = [...qText.matchAll(/<option correct="(true|false)">(.*?)<\/option>/gs)];
    const questionText = qText.replace(/<option.*?<\/option>/gs, "").trim();
    result.question = {
      text: questionText,
      options: optionMatches.map((m, i) => ({
        id: String.fromCharCode(65 + i), // A, B, C, D
        text: m[2].trim(),
        correct: m[1] === "true",
      })),
    };
  }

  // Extract followups
  const followupsMatch = xmlBuffer.match(/<followups>(.*?)<\/followups>/s);
  if (followupsMatch) {
    const followupMatches = [...followupsMatch[1].matchAll(/<followup>(.*?)<\/followup>/gs)];
    result.followups = followupMatches.map(m => m[1].trim());
  }

  // Check if response is complete
  result.complete = xmlBuffer.includes("</response>");

  return result;
}

/**
 * Extract plain text preview from content (strip HTML tags)
 */
export function getContentPreview(content, maxLength = 120) {
  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLength ? plain.slice(0, maxLength) + "..." : plain;
}
