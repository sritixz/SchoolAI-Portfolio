/**
 * MathText.jsx
 * Drop-in replacement for plain text rendering that also renders LaTeX math.
 *
 * Usage:
 *   <MathText text="Solve $x^2 + 2x + 1 = 0$" className="text-sm text-gray-700" />
 *
 * For HTML content (from AI responses):
 *   <MathText html="<b>Key formula:</b> $E = mc^2$" className="text-sm" />
 */
import { renderMath } from "../utils/mathRenderer";

/**
 * Renders plain text with LaTeX math support.
 * Use `text` prop for plain strings, `html` prop for HTML strings.
 */
export default function MathText({ text, html, className = "", tag: Tag = "span", style }) {
  const content = html ?? text ?? "";
  const rendered = renderMath(String(content));

  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
