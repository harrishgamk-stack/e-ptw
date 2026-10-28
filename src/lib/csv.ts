/** Neutralize spreadsheet formulas as well as RFC 4180 delimiters. */
export function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
