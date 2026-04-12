import { test, expect, describe } from "bun:test";
import { formatJson, formatList, toolText } from "../src/format";

describe("formatJson", () => {
  test("pretty-prints an object", () => {
    const out = formatJson({ a: 1, b: "x" });
    expect(out).toContain('"a": 1');
    expect(out).toContain('"b": "x"');
  });
});

describe("formatList", () => {
  test("returns '(no results)' for empty array", () => {
    const out = formatList([], ["id", "name"]);
    expect(out).toContain("no results");
  });

  test("renders markdown table with selected columns and appends JSON block", () => {
    const rows = [
      { id: "1", name: "Acme", domain: "acme.com", extra: "skip" },
      { id: "2", name: "Beta", domain: "beta.io", extra: "skip" },
    ];
    const out = formatList(rows, ["id", "name", "domain"]);
    expect(out).toContain("| id | name | domain |");
    expect(out).toContain("| --- | --- | --- |");
    expect(out).toContain("| 1 | Acme | acme.com |");
    expect(out).toContain("| 2 | Beta | beta.io |");
    expect(out).toContain("```json");
    expect(out).toContain('"extra": "skip"');
  });

  test("missing column renders as empty cell", () => {
    const out = formatList([{ id: "1" }], ["id", "name"]);
    expect(out).toContain("| 1 |  |");
  });

  test("pipe characters in values are escaped", () => {
    const out = formatList([{ id: "a|b", name: "x" }], ["id", "name"]);
    expect(out).toContain("| a\\|b | x |");
  });
});

describe("toolText", () => {
  test("wraps a string in the tool content shape", () => {
    expect(toolText("hello")).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });
});
