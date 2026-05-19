export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";

  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}
