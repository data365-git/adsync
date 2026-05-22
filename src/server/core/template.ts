const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function pickTokens(template: string): string[] {
  return Array.from(template.matchAll(TOKEN_PATTERN), (match) => match[1]!.trim());
}

export type InterpolationResult = {
  value: string;
  warnings: string[];
};

export function interpolateWithWarnings(
  template: string,
  row: Record<string, unknown>,
): InterpolationResult {
  const warnings: string[] = [];
  const value = template.replace(TOKEN_PATTERN, (_match, key: string) => {
    const token = key.trim();
    const rowValue = row[token];
    if (rowValue === null || rowValue === undefined || rowValue === "") {
      warnings.push(token);
      return "";
    }
    if (typeof rowValue === "string") return rowValue;
    if (typeof rowValue === "number" || typeof rowValue === "boolean") {
      return rowValue.toString();
    }
    return JSON.stringify(rowValue);
  });

  return { value, warnings };
}

export function interpolate(
  template: string,
  row: Record<string, unknown>,
): string {
  return interpolateWithWarnings(template, row).value;
}
