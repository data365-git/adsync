import { describe, expect, it } from "vitest";

import { escapeCsv } from "~/lib/csv";

describe("escapeCsv", () => {
  it("returns empty strings for nullish values", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("quotes values containing commas, newlines, or quotes", () => {
    expect(escapeCsv("one,two")).toBe('"one,two"');
    expect(escapeCsv("one\ntwo")).toBe('"one\ntwo"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it("serializes non-string values", () => {
    expect(escapeCsv(42)).toBe("42");
    expect(escapeCsv(true)).toBe("true");
    expect(escapeCsv({ id: 1, name: "Alice" })).toBe(
      '"{""id"":1,""name"":""Alice""}"',
    );
  });
});
