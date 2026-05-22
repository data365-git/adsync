import { isValidElement } from "react";
import type React from "react";
import { describe, expect, it } from "vitest";

import { highlight } from "../highlight";

function textOf(nodes: React.ReactNode[]): string {
  return nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (isValidElement<{ children: string }>(node)) return node.props.children;
      return "";
    })
    .join("");
}

function markedText(nodes: React.ReactNode[]): string[] {
  return nodes
    .filter((node) => isValidElement(node) && node.type === "mark")
    .map((node) =>
      isValidElement<{ children: string }>(node) ? node.props.children : "",
    );
}

describe("highlight", () => {
  it("splits text into plain spans and mark nodes", () => {
    const nodes = highlight("Daily Facebook sync", "Facebook");

    expect(textOf(nodes)).toBe("Daily Facebook sync");
    expect(markedText(nodes)).toEqual(["Facebook"]);
  });

  it("matches case-insensitively", () => {
    const nodes = highlight("Daily Facebook sync", "facebook");

    expect(markedText(nodes)).toEqual(["Facebook"]);
  });

  it("matches multiple whitespace-split tokens", () => {
    const nodes = highlight("Daily Facebook account sync", "daily sync");

    expect(textOf(nodes)).toBe("Daily Facebook account sync");
    expect(markedText(nodes)).toEqual(["Daily", "sync"]);
  });
});
