import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { AREAS, CATALOG, CONVENTIONS, endpointsFor } from "../catalog.js"
import { jsonResult } from "../helpers/index.js"

export function register(server: McpServer) {
  server.tool(
    "umami_catalog",
    "Discover Umami API endpoints and their calling conventions before using umami_api. Call with no area to list the areas, then again with one area to get its endpoints.",
    {
      area: z.enum(AREAS).optional().describe("Endpoint group. Omit to list the areas only."),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (args) => {
      console.error(`umami_catalog area=${args.area ?? "index"}`)

      // Returning every endpoint costs more than most questions need, so the
      // index comes first and the detail is fetched one area at a time.
      if (!args.area) {
        return jsonResult({
          areas: AREAS.map((area) => ({ area, endpoints: CATALOG[area].length })),
          next: "Call umami_catalog again with one area to get its endpoints and conventions.",
        })
      }

      return jsonResult({
        conventions: CONVENTIONS,
        endpoints: endpointsFor(args.area),
        usage: "Substitute ids into the path, then call umami_api with method, path, params, body.",
      })
    },
  )
}
