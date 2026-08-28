import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import { jsonResult, shrinkToBudget } from "../helpers/index.js"

interface Website {
  id: string
  name?: string
  domain?: string
  createdAt?: string
}

type Listing = Website[] | { data?: Website[] }

const rowsOf = (payload: Listing): Website[] =>
  Array.isArray(payload) ? payload : (payload.data ?? [])

export function register(server: McpServer, api: ApiClient, _config: Config) {
  server.tool(
    "list_umami_websites",
    "List the websites this account can read, with their ids. Call this first when the website id is unknown.",
    {
      includeTeams: z
        .boolean()
        .default(true)
        .describe("Also list websites owned by teams the user belongs to."),
      search: z.string().optional().describe("Filter by name or domain."),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (args) => {
      console.error(`list_umami_websites includeTeams=${args.includeTeams}`)

      const own = rowsOf(
        await api.request<Listing>("GET", "/websites", {
          includeTeams: args.includeTeams,
          search: args.search,
        }),
      )

      if (!args.includeTeams) {
        const trimmed = shrinkToBudget(own.map(summarize))
        return jsonResult(trimmed.data, trimmed.notice)
      }

      // The includeTeams flag only resolves team websites for team owners, so a
      // member or view-only user still needs an explicit pass over their teams.
      const teams = rowsOf(await api.request<Listing>("GET", "/me/teams"))
      const teamWebsites = await Promise.all(
        teams.map((team) =>
          api
            .request<Listing>("GET", `/teams/${team.id}/websites`)
            .then(rowsOf)
            .catch(() => [] as Website[]),
        ),
      )

      const byId = new Map(own.map((site) => [site.id, site]))

      for (const site of teamWebsites.flat()) {
        if (!byId.has(site.id)) byId.set(site.id, site)
      }

      const { data, notice } = shrinkToBudget([...byId.values()].map(summarize))

      return jsonResult(data, notice)
    },
  )
}

function summarize(site: Website) {
  return { id: site.id, name: site.name, domain: site.domain, createdAt: site.createdAt }
}
