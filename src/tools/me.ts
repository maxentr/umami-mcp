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
      description: "List websites accessible to the current user.",
      inputSchema: {
        includeTeams: z.boolean().optional(),
      },
      handler: async (args) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/me/websites",
          { query: args },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "name",
            "domain",
          ]),
        );
      },
    }),
  ];
  return tools;
};
