import { z, ZodError, type ZodRawShape } from "zod";
import { UmamiClient, UmamiError } from "../client/umami";

export type ToolContent = { type: "text"; text: string };
export type ToolResult = { content: ToolContent[]; isError?: boolean };
export type ToolHandler<A> = (args: A) => Promise<ToolResult>;

export type ToolContext = {
  client: UmamiClient;
  mode: "cloud" | "self-hosted";
  defaultWebsiteId?: string;
};

export type ToolDef<Shape extends ZodRawShape = ZodRawShape> = {
  name: string;
  description: string;
  inputSchema: Shape;
  handler: ToolHandler<z.infer<z.ZodObject<Shape>>>;
};

export type ToolModule = (ctx: ToolContext) => ToolDef[];

export const def = <Shape extends ZodRawShape>(
  t: ToolDef<Shape>,
): ToolDef =>
  ({ ...t, handler: wrap(t.handler) }) as unknown as ToolDef;

export function wrap<A>(handler: ToolHandler<A>): ToolHandler<A> {
  return async (args: A) => {
    try {
      return await handler(args);
    } catch (e) {
      if (e instanceof UmamiError) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Umami API error (HTTP ${e.status}): ${e.method} ${e.path}${
                e.body ? `\n${e.body}` : ""
              }`,
            },
          ],
        };
      }
      if (e instanceof ZodError) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid arguments: ${JSON.stringify(
                e.flatten().fieldErrors,
              )}`,
            },
          ],
        };
      }
      const msg = e instanceof Error ? e.message : String(e);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${msg}` }],
      };
    }
  };
}

export function resolveWebsiteId(
  provided: string | undefined,
  fallback: string | undefined,
): string {
  const id = provided ?? fallback;
  if (!id) {
    throw new Error(
      "No websiteId provided and UMAMI_DEFAULT_WEBSITE_ID is not set. Call umami_list_websites to discover IDs.",
    );
  }
  return id;
}

export const makeWebsiteIdArg = () =>
  z
    .string()
    .optional()
    .describe(
      "Umami website UUID. Optional if UMAMI_DEFAULT_WEBSITE_ID env var is set.",
    );

const dateCoerce = z
  .union([z.number().int(), z.string()])
  .transform((v, ctx) => {
    if (typeof v === "number") return v;
    const t = Date.parse(v);
    if (Number.isNaN(t)) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid date: ${v}`,
      });
      return z.NEVER;
    }
    return t;
  });

export const dateRangeShape = {
  startAt: dateCoerce.describe(
    "Start of date range. Epoch ms (number) or ISO string.",
  ),
  endAt: dateCoerce.describe(
    "End of date range. Epoch ms (number) or ISO string.",
  ),
};

export const paginationShape = {
  page: z.number().int().positive().optional().describe("Page number, 1-indexed."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .describe("Results per page (max 200)."),
  search: z.string().optional().describe("Search query."),
};

export const filtersShape = {
  url: z.string().optional(),
  referrer: z.string().optional(),
  title: z.string().optional(),
  query: z.string().optional(),
  event: z.string().optional(),
  host: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
  device: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  language: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  tag: z.string().optional(),
};

export const unitShape = {
  unit: z
    .enum(["minute", "hour", "day", "month", "year"])
    .optional()
    .describe("Time bucket size for series endpoints."),
  timezone: z
    .string()
    .optional()
    .describe("IANA timezone (e.g. America/New_York). Defaults to UTC."),
};
