import { describe, it, expect } from "vitest";
import {
  validateStepConfig,
  findFirstInvalidStep,
  fieldLabel,
} from "~/server/core/validate-config";

describe("validateStepConfig", () => {
  it("flags a missing sheets spreadsheet/tab/mapping", () => {
    expect(validateStepConfig("sheets.append", {})).toEqual({
      ok: false,
      field: "spreadsheetId",
    });
    expect(
      validateStepConfig("sheets.append", { spreadsheetId: "abc" }),
    ).toEqual({ ok: false, field: "tabName" });
    expect(
      validateStepConfig("sheets.append", {
        spreadsheetId: "abc",
        tabName: "Sheet1",
      }),
    ).toEqual({ ok: false, field: "mappedFields" });
  });

  it("passes a fully-configured sheets.append step", () => {
    expect(
      validateStepConfig("sheets.append", {
        spreadsheetId: "abc",
        tabName: "Sheet1",
        mappedFields: { name: "{{name}}" },
      }),
    ).toEqual({ ok: true });
  });

  it("flags Bitrix create_lead required fields", () => {
    expect(validateStepConfig("bitrix.create_lead", {})).toEqual({
      ok: false,
      field: "portalId",
    });
    expect(
      validateStepConfig("bitrix.create_lead", { portalId: "p1" }),
    ).toEqual({ ok: false, field: "title" });
    expect(
      validateStepConfig("bitrix.create_lead", { portalId: "p1", title: "Lead" }),
    ).toEqual({ ok: false, field: "name" });
    expect(
      validateStepConfig("bitrix.create_lead", {
        portalId: "p1",
        title: "Lead",
        name: "Ada",
      }),
    ).toEqual({ ok: false, field: "sourceId" });
    expect(
      validateStepConfig("bitrix.create_lead", {
        portalId: "p1",
        title: "Lead",
        name: "Ada",
        sourceId: "WEB",
      }),
    ).toEqual({ ok: true });
  });

  it("treats whitespace-only and empty collections as missing", () => {
    expect(
      validateStepConfig("bitrix.create_lead", {
        portalId: "p1",
        title: "   ",
        name: "Ada",
        sourceId: "WEB",
      }),
    ).toEqual({ ok: false, field: "title" });
    expect(
      validateStepConfig("sheets.append", {
        spreadsheetId: "abc",
        tabName: "Sheet1",
        mappedFields: {},
      }),
    ).toEqual({ ok: false, field: "mappedFields" });
  });
});

describe("findFirstInvalidStep", () => {
  const valid = [
    { position: 1, moduleType: "trigger.manual", config: {} },
    {
      position: 2,
      moduleType: "sheets.append",
      config: {
        spreadsheetId: "abc",
        tabName: "Sheet1",
        mappedFields: { name: "{{name}}" },
      },
    },
  ];

  it("returns null when every step is complete", () => {
    expect(findFirstInvalidStep(valid)).toBeNull();
  });

  it("returns the first incomplete step with its missing field", () => {
    const steps = [
      { position: 1, moduleType: "trigger.manual", config: {} },
      { position: 2, moduleType: "sheets.append", config: { spreadsheetId: "abc" } },
      { position: 3, moduleType: "bitrix.create_lead", config: {} },
    ];
    expect(findFirstInvalidStep(steps)).toEqual({
      position: 2,
      moduleType: "sheets.append",
      field: "tabName",
    });
  });
});

describe("fieldLabel", () => {
  it("humanizes known fields and falls back to the raw key", () => {
    expect(fieldLabel("spreadsheetId")).toBe("spreadsheet");
    expect(fieldLabel("watchColumn")).toBe("watch column");
    expect(fieldLabel("sourceId")).toBe("source");
    expect(fieldLabel("somethingUnknown")).toBe("somethingUnknown");
  });
});
