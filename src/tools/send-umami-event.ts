import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import { assertIngestAllowed, jsonResult } from "../helpers/index.js"

/**
 * Kept out of the named schema and listed in prose instead: ingestion is a rare,
 * write-gated call, and naming each of these costs schema bytes in every
 * tools/list of every session that never ingests anything.
 */
const ATTRIBUTE_FIELDS =
  "referrer, hostname, title, language, screen (e.g. 1920x1080), tag, " +
  "timestamp (epoch SECONDS, not ms), ip, userAgent, browser, os, device, " +
  "and for type 'performance': lcp, inp, cls, fcp, ttfb (ms; cls is unitless)"

export function register(server: McpServer, api: ApiClient, config: Config) {
  server.tool(
    "send_umami_event",
    "Ingest one event into Umami. type 'event' records a pageview (no name) or a custom event (with name); 'identify' attaches a distinct id and session properties; 'performance' records Core Web Vitals. To backfill many at once, POST an array to /batch with umami_api (self-hosted only, max 500).",
    {
      type: z.enum(["event", "identify", "performance"]).default("event"),
      website: z
        .string()
        .optional()
        .describe("Website uuid. Defaults to UMAMI_DEFAULT_WEBSITE_ID."),
      name: z.string().optional().describe("Custom event name. Omit to record a pageview."),
      url: z
        .string()
        .optional()
        .describe("Page path or URL. UTM params and click ids are parsed from it."),
      id: z.string().optional().describe("Visitor distinct id. Required for type 'identify'."),
      data: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Custom event properties, or session properties for type 'identify'."),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(`Further payload fields, as an object: ${ATTRIBUTE_FIELDS}.`),
      link: z.string().optional().describe("Short link uuid, instead of website."),
      pixel: z.string().optional().describe("Pixel uuid, instead of website."),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args) => {
      assertIngestAllowed(config)

      const { type, attributes, ...named } = args
      const payload: Record<string, unknown> = { ...attributes }

      for (const [key, value] of Object.entries(named)) {
        if (value !== undefined) payload[key] = value
      }

      // Umami rejects a payload that does not name exactly one source.
      if (!payload.website && !payload.link && !payload.pixel) {
        if (!config.defaultWebsiteId) {
          throw new Error("Give one of website, link or pixel, or set UMAMI_DEFAULT_WEBSITE_ID.")
        }
        payload.website = config.defaultWebsiteId
      }

      if (type === "identify" && !payload.id && !payload.data) {
        throw new Error("type 'identify' needs id (distinct id) and/or data (session properties).")
      }

      console.error(`send_umami_event type=${type}`)

      return jsonResult(await api.sendEvent(type, payload))
    },
  )
}
