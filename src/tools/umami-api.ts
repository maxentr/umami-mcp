import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import {
  assertWritesAllowed,
  isWriteMethod,
  jsonResult,
  projectFields,
  shrinkToBudget,
} from "../helpers/index.js"

/** Applied when the caller names no page size, so a bare list call cannot flood context. */
const DEFAULT_PAGE_SIZE = 50

export function register(server: McpServer, api: ApiClient, config: Config) {
  server.tool(
    "umami_api",
    "Call any Umami API endpoint. Covers the whole API, including what the other tools do not expose (segments, boards, links, pixels, replays, shares, exports, pivots, admin). Call umami_catalog first for the path and its parameters.",
    {
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      path: z
        .string()
        .describe(
          "Endpoint path with ids substituted, e.g. '/websites/<id>/stats'. No /api or /v1 prefix.",
        ),
      params: z.record(z.string(), z.unknown()).optional().describe("Query string parameters."),
      body: z.record(z.string(), z.unknown()).optional().describe("JSON request body."),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Keep only these keys on each returned row. Use it whenever the question needs a few columns; Umami rows are wide.",
        ),
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (args) => {
      assertWritesAllowed(config, args.method, args.path)

      const params = { ...args.params } as Record<string, string | number | boolean>

      // Umami returns every row when no page size is given, which is the main
      // way a single call can blow up the context window.
      if (
        !isWriteMethod(args.method) &&
        params.pageSize === undefined &&
        params.limit === undefined
      ) {
        params.pageSize = DEFAULT_PAGE_SIZE
      }

      console.error(`umami_api ${args.method} ${args.path}`)

      const raw = await api.request(args.method, args.path, params, args.body)
      const projected = args.fields?.length ? projectFields(raw, args.fields) : raw
      const { data, notice } = shrinkToBudget(projected)

      return jsonResult(data, notice)
    },
  )
}
