import { z } from "zod";
import { def, type ToolDef, type ToolModule } from "./_helpers";
import { formatJson, formatList, toolText } from "../format";

export const meTools: ToolModule = (ctx) => {
  const tools: ToolDef[] = [
    def({
      name: "umami_whoami",
      description: "Return the currently authenticated Umami user.",
      inputSchema: {},
      handler: async () => {
        const data = await ctx.client.request("GET", "/me");
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_list_my_websites",
      description:
        "List websites accessible to the current user, including websites from teams the user belongs to. Fetches team websites automatically since the Umami API's includeTeams param only works for team owners.",
      inputSchema: {
        includeTeams: z
          .boolean()
          .default(true)
          .describe(
            "Also fetch websites from teams the user belongs to. Defaults to true.",
          ),
      },
      handler: async (args) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/me/websites",
          { query: { includeTeams: args.includeTeams } },
        );
        let rows = (
          Array.isArray(data) ? data : data.data ?? []
        ) as Record<string, unknown>[];

        if (args.includeTeams) {
          const teams = await ctx.client.request<{ data?: unknown[] }>(
            "GET",
            "/me/teams",
          );
          const teamList = (
            Array.isArray(teams) ? teams : teams.data ?? []
          ) as { id: string }[];

          const seen = new Set(rows.map((r) => r.id));
          for (const team of teamList) {
            const tw = await ctx.client.request<{ data?: unknown[] }>(
              "GET",
              `/teams/${team.id}/websites`,
            );
            const teamRows = (
              Array.isArray(tw) ? tw : tw.data ?? []
            ) as Record<string, unknown>[];
            for (const site of teamRows) {
              if (!seen.has(site.id)) {
                seen.add(site.id as string);
                rows.push(site);
              }
            }
          }
        }

        return toolText(
          formatList(rows, ["id", "name", "domain"]),
        );
      },
    }),
  ];
  return tools;
};
