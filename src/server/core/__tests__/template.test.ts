import { describe, expect, it } from "vitest";

import { interpolate, pickTokens } from "../template";

describe("interpolate", () => {
  it("leaves empty and literal strings unchanged", () => {
    expect(interpolate("", { Name: "Alice" })).toBe("");
    expect(interpolate("Lead", { Name: "Alice" })).toBe("Lead");
  });

  it("replaces a single token", () => {
    expect(interpolate("{{Name}}", { Name: "Alice" })).toBe("Alice");
  });

  it("replaces mixed literals and tokens", () => {
    expect(interpolate("Lead {{Name}} ({{id}})", { Name: "Alice", id: 7 })).toBe(
      "Lead Alice (7)",
    );
  });

  it("uses an empty string for missing keys", () => {
    expect(interpolate("Lead {{missing}}", {})).toBe("Lead ");
  });

  it("replaces repeated tokens", () => {
    expect(interpolate("{{Name}} / {{ Name }}", { Name: "Alice" })).toBe(
      "Alice / Alice",
    );
  });

  it("does not implement escaping in v1", () => {
    expect(interpolate("\\{{Name}}", { Name: "Alice" })).toBe("\\Alice");
  });
});

describe("pickTokens", () => {
  it("returns token names in order", () => {
    expect(pickTokens("Lead {{ Name }} ({{id}})")).toEqual(["Name", "id"]);
  });

  it("keeps multiple instances of the same token", () => {
    expect(pickTokens("{{Name}} {{Name}}")).toEqual(["Name", "Name"]);
  });
});
