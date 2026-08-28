import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import { jsonResult, resolveWebsiteId } from "../helpers/index.js"

const REPORT_TYPES = [
  "attribution",
  "breakdown",
  "funnel",
  "goal",
  "heatmap",
  "journey",
  "performance",
  "retention",
  "revenue",
  "utm",
] as const

/**
 * Parameter shape per report type, kept next to the tool so the model gets it
 * in the error path as well as from umami_catalog. Umami v3 spells funnel and
 * attribution step types "path"/"event" and attribution models "first-click"/
 * "last-click"; the v2 spellings are silently rejected.
 */
const PARAMETER_HELP: Record<(typeof REPORT_TYPES)[number], string> = {
  attribution:
    '{startDate, endDate, model: "first-click"|"last-click", type: "path"|"event", step, currency?}',
  breakdown: "{startDate, endDate, fields: [filter field names]}",
  funnel:
    '{startDate, endDate, window: minutes, steps: [{type: "path"|"event", value}] (2-8 steps)}',
  goal: "{startDate, endDate, type, value}",
  heatmap: '{startDate, endDate, urlPath?, mode?: "click"|"scroll"}',
  journey: "{startDate, endDate, steps: 2-7, startStep?, endStep?}",
  performance: '{startDate, endDate, unit?, timezone?, metric?: "lcp"|"inp"|"cls"|"fcp"|"ttfb"}',
  retention: "{startDate, endDate, timezone?}",
  revenue: "{startDate, endDate, currency, unit?, timezone?, compare?}",
  utm: "{startDate, endDate}",
}

export function register(server: McpServer, api: ApiClient, config: Config) {
  server.tool(
    "run_umami_report",
    `Run an Umami report: ${REPORT_TYPES.join(", ")}. Reports are read-only analyses, not saved objects.`,
    {
      type: z.enum(REPORT_TYPES).describe("Report type."),
      websiteId: z
        .string()
        .optional()
        .describe("Website uuid. Defaults to UMAMI_DEFAULT_WEBSITE_ID."),
      parameters: z
        .record(z.string(), z.unknown())
        .describe(
          "Report parameters. Always needs startDate and endDate; the rest depends on type. Call umami_catalog area='reports' for the exact shape, or read it off the error this tool returns.",
        ),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional filters (path, country, browser, event, segment, ...)."),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (args) => {
      const websiteId = resolveWebsiteId(args.websiteId, config)

      if (!args.parameters.startDate || !args.parameters.endDate) {
        throw new Error(
          `Report "${args.type}" needs startDate and endDate in parameters. Expected shape: ${PARAMETER_HELP[args.type]}`,
        )
      }

      console.error(`run_umami_report ${args.type} website=${websiteId}`)

      // Umami expects the report body nested, not flattened onto the root.
      const data = await api.request("POST", `/reports/${args.type}`, undefined, {
        websiteId,
        type: args.type,
        parameters: args.parameters,
        filters: args.filters ?? {},
      })

      return jsonResult(data)
    },
  )
}
