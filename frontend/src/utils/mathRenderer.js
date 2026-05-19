/**
 * mathRenderer.js
 * Renders LaTeX math expressions inside HTML strings using KaTeX.
 *
 * Supported delimiters:
 *   Display math:  $$...$$ or \[...\]
 *   Inline math:   $...$ or \(...\)
 *   Bare LaTeX:    \text{...}, \frac{...}{...}, \times, \rho, etc. (auto-wrapped)
 */
import katex from "katex";

function renderLatex(latex, displayMode = false) {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    return `<code class="math-fallback">${latex}</code>`;
  }
}

// Bare LaTeX command pattern — commands the LLM commonly emits without delimiters
const BARE_LATEX_RE = /\\(?:text|frac|times|div|cdot|rho|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|sqrt|sum|int|infty|partial|nabla|vec|hat|bar|overline|underline|left|right|pm|mp|leq|geq|neq|approx|equiv|propto|in|notin|subset|supset|cup|cap|forall|exists)\b/;

function hasBareLatex(text) {
  return BARE_LATEX_RE.test(text);
}

export function renderMath(text) {
  if (!text || typeof text !== "string") return text;

  const hasDelimiters = text.includes("$") || text.includes("\\(") || text.includes("\\[");
  const hasBare = hasBareLatex(text);

  if (!hasDelimiters && !hasBare) return text;

  let result = text;

  // 1. Display math: $$...$$
  result = result.replace(/\$\$([^$]+?)\$\$/g, (_, latex) =>
    `<span class="math-display">${renderLatex(latex, true)}</span>`
  );

  // 2. Display math: \[...\]
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) =>
    `<span class="math-display">${renderLatex(latex, true)}</span>`
  );

  // 3. Inline math: $...$
  // Require meaningful math content to avoid treating "$5" (currency) as LaTeX.
  // Rules:
  //   - Must contain at least one math operator/symbol (not just digits)
  //   - Must NOT be a plain number like "$5" or "$100"
  //   - Must NOT start with a digit (currency guard: $5, $100, $1.5)
  result = result.replace(/(?<!\$)\$([^$\n]{1,200}?)\$(?!\$)/g, (match, latex) => {
    const trimmed = latex.trim();
    // Reject plain currency: starts with digit or is purely numeric
    if (/^\d/.test(trimmed) || /^\d[\d.,\s]*$/.test(trimmed)) return match;
    // Must have actual math content: operators, backslash commands, or mixed alphanum
    const hasMathContent =
      /[\\^_{}=+\-*/]/.test(trimmed) &&
      /[\\^_{}=+\-*/]|\\[a-zA-Z]|\d+[a-zA-Z]|[a-zA-Z]\d/.test(trimmed);
    if (!hasMathContent) return match;
    return `<span class="math-inline">${renderLatex(trimmed, false)}</span>`;
  });

  // 4. Inline math: \(...\)
  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_, latex) =>
    `<span class="math-inline">${renderLatex(latex, false)}</span>`
  );

  // 5. Bare LaTeX — LLM emitted \text{...} or \frac{...} without any delimiter.
  //    Process line-by-line to avoid corrupting already-rendered HTML spans.
  if (hasBare) {
    result = result
      .split(/\n/)
      .map((line) => {
        // Skip lines already containing rendered KaTeX or HTML tags
        if (line.includes("katex") || /<span[\s\S]*?>/.test(line)) return line;
        if (!hasBareLatex(line)) return line;

        const stripped = line.trim();

        // Pure math line: starts with a backslash command or is entirely math notation
        const isPureMathLine =
          /^\\[a-zA-Z]/.test(stripped) ||
          /^[A-Za-z_\s]*\\[a-zA-Z][\s\S]*=[\s\S]*\\[a-zA-Z]/.test(stripped);

        if (isPureMathLine) {
          return `<div class="my-1">${renderLatex(stripped, false)}</div>`;
        }

        // Mixed line: find bare LaTeX segments and wrap them inline.
        // Match from a backslash command through balanced braces / typical math chars.
        return line.replace(
          /\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*[^<\n,.]*/g,
          (match) => {
            if (!hasBareLatex(match)) return match;
            return `<span class="math-inline">${renderLatex(match.trim(), false)}</span>`;
          }
        );
      })
      .join("\n");
  }

  return result;
}

/**
 * Converts common markdown syntax to HTML.
 * Handles: ***bold+italic***, **bold**, *italic*, `code`, and newlines → <br>.
 * Safe to run before renderMath — does not touch $ or \ sequences.
 */
export function renderMarkdown(text) {
  if (!text || typeof text !== "string") return text;
  return text
    // ***bold italic***
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *italic* (not preceded/followed by another *)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    // `inline code`
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-xs font-mono">$1</code>')
    // newlines → <br>
    .replace(/\n/g, "<br>");
}

export function stripMath(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\$\$([^$]+?)\$\$/g, (_, l) => l.trim())
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, l) => l.trim())
    .replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, l) => l.trim())
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, l) => l.trim());
}
