import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import { jsonResult, resolveWebsiteId, shrinkToBudget } from "../helpers/index.js"
import { dateRangeShape, filtersParam, toQueryParams, websiteIdParam } from "../helpers/params.js"

/** Umami v3 column names. v2 spellings such as `url` or `utm_source` return nothing. */
const METRIC_TYPES = [
  "path",
  "fullPath",
  "entry",
  "exit",
  "referrer",
  "domain",
  "title",
  "query",
  "event",
  "tag",
  "hostname",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "browser",
  "os",
  "device",
  "screen",
  "language",
  "country",
  "region",
  "city",
  "distinctId",
  "channel",
] as const

export function register(server: McpServer, api: ApiClient, config: Config) {
  server.tool(
    "get_umami_metrics",
    "Top values for one dimension over a date range. Use this for top pages (type 'path'), top referrers, browsers, countries, custom events (type 'event'), and so on.",
    {
      websiteId: websiteIdParam,
      type: z.enum(METRIC_TYPES).describe("Dimension to group by."),
      limit: z.number().int().positive().max(500).optional().describe("Rows to return."),
      offset: z.number().int().nonnegative().optional(),
      ...dateRangeShape,
      filters: filtersParam,
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (args) => {
      const { websiteId, filters, ...query } = args
      const id = resolveWebsiteId(websiteId, config)

      console.error(`get_umami_metrics website=${id} type=${args.type}`)

      const raw = await api.request(
        "GET",
        `/websites/${id}/metrics`,
        toQueryParams({ ...query, ...filters }),
      )
      const { data, notice } = shrinkToBudget(raw)

      return jsonResult(data, notice)
    },
  )
}
