import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("shapeRowsByHeader", () => {
  it("keys each data row by the header row plus a 1-indexed `row` field", async () => {
    const { shapeRowsByHeader } = await import("../sheets-client");
    const values = [
      ["name", "phone", "email"],
      ["Alice", "111", "a@x.com"],
      ["Bob", "222", "b@x.com"],
    ];
    expect(shapeRowsByHeader(values)).toEqual([
      { row: 2, name: "Alice", phone: "111", email: "a@x.com" },
      { row: 3, name: "Bob", phone: "222", email: "b@x.com" },
    ]);
  });

  it("skips a blank header cell WITHOUT shifting later columns (misalignment fix)", async () => {
    const { shapeRowsByHeader } = await import("../sheets-client");
    // The middle column has no header. `email` must still read from column 3,
    // not from the unnamed middle column.
    const values = [
      ["name", "", "email"],
      ["Alice", "ignored-unnamed", "a@x.com"],
    ];
    expect(shapeRowsByHeader(values)).toEqual([
      { row: 2, name: "Alice", email: "a@x.com" },
    ]);
  });

  it("returns [] when there is no data row", async () => {
    const { shapeRowsByHeader } = await import("../sheets-client");
    expect(shapeRowsByHeader([])).toEqual([]);
    expect(shapeRowsByHeader([["name", "email"]])).toEqual([]);
  });

  it("fills missing trailing cells with empty strings", async () => {
    const { shapeRowsByHeader } = await import("../sheets-client");
    const values = [
      ["name", "phone", "email"],
      ["Alice"], // phone + email absent in the data row
    ];
    expect(shapeRowsByHeader(values)).toEqual([
      { row: 2, name: "Alice", phone: "", email: "" },
    ]);
  });
});

describe("parseRowIdentifier", () => {
  it("parses a bare numeric string as a row number", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(parseRowIdentifier("3")).toEqual({ kind: "row", row: 3 });
    expect(parseRowIdentifier("15")).toEqual({ kind: "row", row: 15 });
  });

  it("parses 'column=value' as a key lookup", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(parseRowIdentifier("id=42")).toEqual({
      kind: "key",
      column: "id",
      value: "42",
    });
    expect(parseRowIdentifier("email=alice@example.com")).toEqual({
      kind: "key",
      column: "email",
      value: "alice@example.com",
    });
  });

  it("handles values with spaces in the value portion", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(parseRowIdentifier("name=Alice Smith")).toEqual({
      kind: "key",
      column: "name",
      value: "Alice Smith",
    });
  });

  it("trims whitespace around column and value", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(parseRowIdentifier("  id  =  42  ")).toEqual({
      kind: "key",
      column: "id",
      value: "42",
    });
  });

  it("throws on bare non-numeric strings", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(() => parseRowIdentifier("hello")).toThrow(/Invalid rowIdentifier/);
  });

  it("throws on empty string", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(() => parseRowIdentifier("")).toThrow(/Invalid rowIdentifier/);
  });

  it("throws when column or value is empty after trim", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(() => parseRowIdentifier("=42")).toThrow(/Invalid rowIdentifier/);
    expect(() => parseRowIdentifier("id=")).toThrow(/Invalid rowIdentifier/);
  });

  it("throws on row number 0 or negative", async () => {
    const { parseRowIdentifier } = await import("../sheets-client");
    expect(() => parseRowIdentifier("0")).toThrow(/Invalid rowIdentifier/);
    expect(() => parseRowIdentifier("-3")).toThrow(/Invalid rowIdentifier/);
  });
});
