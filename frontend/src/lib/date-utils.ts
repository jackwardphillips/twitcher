/**
 * Parses a YYYY-MM-DD string into a local Date object at midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a YYYY-MM-DD string as "MMM D" (e.g., "Apr 1").
 */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
