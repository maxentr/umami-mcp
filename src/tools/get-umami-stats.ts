import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import { jsonResult, resolveWebsiteId } from "../helpers/index.js"
import { dateRangeShape, filtersParam, toQueryParams, websiteIdParam } from "../helpers/params.js"

export function register(server: McpServer, api: ApiClient, config: Config) {
  server.tool(
    "get_umami_stats",
    "Totals for a website over a date range: pageviews, visitors, visits, bounces and time on site. Use this for 'how much traffic did X get'.",
    {
      websiteId: websiteIdParam,
      ...dateRangeShape,
      filters: filtersParam,
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (args) => {
      const { websiteId, filters, ...query } = args
      const id = resolveWebsiteId(websiteId, config)

      console.error(`get_umami_stats website=${id}`)

      const data = await api.request(
        "GET",
        `/websites/${id}/stats`,
        toQueryParams({ ...query, ...filters }),
      )

      return jsonResult(data)
    },
  )
}
