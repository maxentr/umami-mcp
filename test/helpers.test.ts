import { test, expect, describe } from "bun:test";
import { z } from "zod";
import {
  wrap,
  makeWebsiteIdArg,
  dateRangeShape,
  paginationShape,
  filtersShape,
  resolveWebsiteId,
} from "../src/tools/_helpers";
import { UmamiError } from "../src/client/umami";

describe("wrap()", () => {
  test("passes through successful handler result", async () => {
    const handler = async (args: { n: number }) => ({
      content: [{ type: "text" as const, text: `n=${args.n}` }],
    });
    const wrapped = wrap(handler);
    const result = await wrapped({ n: 7 });
    expect(result).toEqual({
      content: [{ type: "text", text: "n=7" }],
    });
  });

  test("converts UmamiError to isError tool response", async () => {
    const handler = async () => {
      throw new UmamiError({
        status: 404,
        method: "GET",
        path: "/websites/x",
        body: "not found",
      });
    };
    const result = await wrap(handler)({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.type).toBe("text");
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("404");
    expect(text).toContain("/websites/x");
  });

  test("converts ZodError to isError tool response", async () => {
    const schema = z.object({ name: z.string() });
    const handler = async (args: unknown) => {
      schema.parse(args);
      return { content: [{ type: "text" as const, text: "ok" }] };
    };
    const result = await wrap(handler)({ name: 123 });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text.toLowerCase()).toContain("invalid");
  });

  test("converts plain Error to isError tool response (never crashes server)", async () => {
    const handler = async () => {
      throw new Error("boom");
    };
    const result = await wrap(handler)({});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain("boom");
  });
});

describe("resolveWebsiteId()", () => {
  test("returns provided id when passed", () => {
    expect(resolveWebsiteId("given", "default")).toBe("given");
  });

  test("falls back to default when id is undefined", () => {
    expect(resolveWebsiteId(undefined, "default")).toBe("default");
  });

  test("throws when neither is set", () => {
    expect(() => resolveWebsiteId(undefined, undefined)).toThrow(
      /websiteId/i,
    );
  });
});

describe("dateRangeShape", () => {
  test("accepts numeric epoch ms", () => {
    const schema = z.object(dateRangeShape);
    const parsed = schema.parse({ startAt: 1000, endAt: 2000 });
    expect(parsed.startAt).toBe(1000);
    expect(parsed.endAt).toBe(2000);
  });

  test("coerces ISO date string to epoch ms", () => {
    const schema = z.object(dateRangeShape);
    const parsed = schema.parse({
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2026-01-02T00:00:00Z",
    });
    expect(parsed.startAt).toBe(new Date("2026-01-01T00:00:00Z").getTime());
    expect(parsed.endAt).toBe(new Date("2026-01-02T00:00:00Z").getTime());
  });

  test("rejects garbage strings", () => {
    const schema = z.object(dateRangeShape);
    expect(() => schema.parse({ startAt: "not a date", endAt: 1 })).toThrow();
  });
});

describe("paginationShape + filtersShape + makeWebsiteIdArg", () => {
  test("pagination fields all optional", () => {
    const schema = z.object(paginationShape);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ page: 2, pageSize: 50, search: "foo" })).toEqual({
      page: 2,
      pageSize: 50,
      search: "foo",
    });
  });

  test("filters fields all optional + unknown fields rejected", () => {
    const schema = z.object(filtersShape);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ url: "/", browser: "chrome" })).toEqual({
      url: "/",
      browser: "chrome",
    });
  });

  test("makeWebsiteIdArg() returns an optional string Zod schema", () => {
    const schema = z.object({ websiteId: makeWebsiteIdArg() });
    expect(schema.parse({}).websiteId).toBeUndefined();
    expect(schema.parse({ websiteId: "x" }).websiteId).toBe("x");
  });
});
