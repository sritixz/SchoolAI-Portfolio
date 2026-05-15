import { useState } from "react";
import { ResponseValidator } from "../utils/responseValidator";

/**
 * Debug component to display response validation results.
 * Shows in development mode to help verify LLM response quality.
 */
export function ResponseValidationDebug({ parsed, turnNumber = 1, grade = "", isDev = false }) {
  const [showDebug, setShowDebug] = useState(false);

  if (!isDev || !parsed || !parsed.content) return null;

  const validation = ResponseValidator.validateResponse(parsed, turnNumber, grade);

  return (
    <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">
            {validation.isValid ? "check_circle" : "error"}
          </span>
          Response Validation {validation.isValid ? "✓" : "✗"}
        </span>
        <span className="material-symbols-outlined text-sm">
          {showDebug ? "expand_less" : "expand_more"}
        </span>
      </button>

      {showDebug && (
        <div className="p-4 space-y-4 bg-white">
          {/* Status Summary */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Status</p>
            <div className="flex gap-4 text-xs">
              <div className={`px-3 py-1 rounded ${validation.isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {validation.isValid ? "✓ Valid" : "✗ Invalid"}
              </div>
              <div className="px-3 py-1 rounded bg-slate-100 text-slate-700">
                Turn: {turnNumber}
              </div>
              {grade && (
                <div className="px-3 py-1 rounded bg-slate-100 text-slate-700">
                  Grade: {grade}
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                Errors ({validation.errors.length})
              </p>
              <ul className="space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                Warnings ({validation.warnings.length})
              </p>
              <ul className="space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">⚠</span>
                    <span>{warn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Field Presence */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fields Present</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["subject", parsed.subject ? "✓" : "✗"],
                ["content", parsed.content ? "✓" : "✗"],
                ["hint", parsed.hint ? "✓" : "✗"],
                ["steps", parsed.steps?.length > 0 ? `✓ (${parsed.steps.length})` : "✗"],
                ["question", parsed.question ? "✓" : "✗"],
                ["exam_ready", parsed.examReady ? "✓" : "✗"],
                ["followups", parsed.followups?.length > 0 ? `✓ (${parsed.followups.length})` : "✗"],
                ["media_query", parsed.mediaQuery ? "✓" : "✗"],
              ].map(([field, status]) => (
                <div key={field} className="flex justify-between px-2 py-1 bg-slate-50 rounded">
                  <span className="text-slate-600">{field}:</span>
                  <span className={status === "✓" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Preview */}
          {parsed.content && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Content Preview</p>
              <div className="p-2 bg-slate-50 rounded text-xs text-slate-700 max-h-24 overflow-y-auto">
                {parsed.content.replace(/<[^>]+>/g, " ").slice(0, 200)}...
              </div>
            </div>
          )}

          {/* Raw Parsed Data */}
          <details className="space-y-2">
            <summary className="text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer hover:text-slate-800">
              Raw Parsed Data
            </summary>
            <pre className="p-2 bg-slate-50 rounded text-[10px] overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
