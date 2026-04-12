import { z } from "zod";
import {
  def,
  makeWebsiteIdArg,
  resolveWebsiteId,
  type ToolDef,
  type ToolModule,
} from "./_helpers";
import { formatJson, formatList, toolText } from "../format";

const dateStringShape = {
  startDate: z
    .string()
    .describe("ISO date or datetime, e.g. 2026-01-01 or 2026-01-01T00:00:00Z."),
  endDate: z.string(),
};

const funnelStep = z.object({
  type: z.enum(["url", "event"]),
  value: z.string(),
});

export const reportTools: ToolModule = (ctx) => {
  const runReport = async (
    type: string,
    websiteId: string | undefined,
    extra: Record<string, unknown>,
  ) => {
    const id = resolveWebsiteId(websiteId, ctx.defaultWebsiteId);
    const data = await ctx.client.request("POST", `/reports/${type}`, {
      body: { websiteId: id, ...extra },
    });
    return toolText(formatJson(data));
  };

  const tools: ToolDef[] = [
    def({
      name: "umami_list_reports",
      description: "List saved reports for a website, optionally filtered by type.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        type: z.string().optional(),
      },
      handler: async ({ websiteId, type }) => {
        const id = resolveWebsiteId(websiteId, ctx.defaultWebsiteId);
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/reports",
          { query: { websiteId: id, type } },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "name",
            "type",
            "createdAt",
          ]),
        );
      },
    }),
    def({
      name: "umami_get_report",
      description: "Fetch a saved report by id.",
      inputSchema: { reportId: z.string() },
      handler: async ({ reportId }) => {
        const data = await ctx.client.request("GET", `/reports/${reportId}`);
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_report_funnel",
      description: "Funnel conversion report across an ordered set of steps.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        steps: z.array(funnelStep).min(2),
        window: z
          .number()
          .int()
          .positive()
          .describe("Conversion window in minutes."),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("funnel", websiteId, extra),
    }),
    def({
      name: "umami_report_retention",
      description: "Retention cohorts report.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        timezone: z.string().optional(),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("retention", websiteId, extra),
    }),
    def({
      name: "umami_report_goal",
      description: "Goal tracking report.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        type: z.enum(["url", "event"]).describe("Goal type."),
        value: z.string().describe("URL path or event name."),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("goal", websiteId, extra),
    }),
    def({
      name: "umami_report_journey",
      description: "User journey report between start and end steps.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        steps: z.number().int().positive(),
        startStep: z.string(),
        endStep: z.string(),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("journey", websiteId, extra),
    }),
    def({
      name: "umami_report_attribution",
      description: "Attribution report across an ordered funnel.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        model: z
          .enum(["firstClick", "lastClick"])
          .describe("Attribution model."),
        type: z.string(),
        step: z.string(),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("attribution", websiteId, extra),
    }),
    def({
      name: "umami_report_utm",
      description: "UTM campaign report — sources, mediums, campaigns.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("utm", websiteId, extra),
    }),
    def({
      name: "umami_report_revenue",
      description: "Revenue report grouped by currency.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        currency: z.string().length(3).describe("ISO 4217 currency code."),
        compare: z.string().optional(),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("revenue", websiteId, extra),
    }),
    def({
      name: "umami_report_performance",
      description: "Core Web Vitals performance report.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        metric: z.string().optional(),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("performance", websiteId, extra),
    }),
    def({
      name: "umami_report_breakdown",
      description: "Breakdown report segmented by one or more fields.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        ...dateStringShape,
        fields: z.array(z.string()).min(1),
      },
      handler: async ({ websiteId, ...extra }) =>
        runReport("breakdown", websiteId, extra),
    }),
  ];
  return tools;
};
