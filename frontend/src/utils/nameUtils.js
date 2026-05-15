const HONORIFICS = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Sir|Madam)\s+/i;

/**
 * Returns the first name, stripping any leading honorific prefix.
 * e.g. "Mr. John Smith" → "John"
 *      "Dr. Priya Nair" → "Priya"
 *      "Alice"          → "Alice"
 */
export function getFirstName(fullName) {
  if (!fullName) return "";
  const stripped = fullName.replace(HONORIFICS, "").trim();
  return stripped.split(" ")[0] || fullName;
}

/**
 * Returns the first letter of the actual first name (no honorific).
 * e.g. "Mr. John Smith" → "J"
 *      "Alice"          → "A"
 */
export function getInitial(fullName, fallback = "?") {
  const first = getFirstName(fullName);
  return first?.[0]?.toUpperCase() || fallback;
}
