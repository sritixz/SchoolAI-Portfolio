import { useRef, useState } from "react";

/**
 * SearchBar — reusable, polished search input.
 *
 * Props:
 *   value        string   — controlled value
 *   onChange     fn       — (newValue: string) => void
 *   placeholder  string   — input placeholder
 *   resultCount  number   — when provided, shows a small badge "N results"
 *   className    string   — extra wrapper classes
 *   width        string   — tailwind max-w class, default "max-w-md"
 */
export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Search...",
  resultCount,
  className = "",
  width = "max-w-md",
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all duration-200 ${width} w-full ${className} ${
        focused
          ? "bg-white border border-[#695be6] shadow-[0_0_0_3px_rgba(105,91,230,0.12)]"
          : "bg-gray-100 border border-transparent hover:bg-gray-200/70"
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Icon */}
      <span
        className={`material-symbols-outlined text-lg shrink-0 transition-colors duration-200 ${
          focused ? "text-[#695be6]" : "text-gray-400"
        }`}
      >
        search
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="bg-transparent text-sm outline-none w-full placeholder-gray-400 text-gray-800"
      />

      {/* Result count badge */}
      {resultCount !== undefined && value.length > 0 && (
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#695be6]/10 text-[#695be6] whitespace-nowrap">
          {resultCount}
        </span>
      )}

      {/* Clear button */}
      {value.length > 0 && (
        <button
          onMouseDown={(e) => e.preventDefault()} // prevent blur before click
          onClick={handleClear}
          className="shrink-0 size-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-[#695be6] hover:text-white text-gray-500 transition-colors duration-150"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-xs leading-none">close</span>
        </button>
      )}
    </div>
  );
}
