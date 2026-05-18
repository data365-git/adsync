const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function pickTokens(template: string): string[] {
  return Array.from(template.matchAll(TOKEN_PATTERN), (match) => match[1]!.trim());
}

export function interpolate(
  template: string,
  row: Record<string, unknown>,
): string {
  return template.replace(TOKEN_PATTERN, (_match, key: string) => {
    const value = row[key.trim()];
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return value.toString();
    }
    return JSON.stringify(value);
  });
}
