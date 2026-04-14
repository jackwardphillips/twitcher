/**
 * Normalizes a scientific name by stripping parenthetical qualifiers and trimming whitespace.
 * Example: "Lonchura malacca (Exotic: Naturalized)" -> "Lonchura malacca"
 */
export function normalizeScientificName(raw: string): string {
  if (!raw) return '';
  // Remove content within parentheses and the parentheses themselves
  // Handle nested or multiple sets by using global flag
  return raw.replace(/\s*\(.*?\)/g, '').trim();
}
