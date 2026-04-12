import { z } from "zod";
import {
  def,
  paginationShape,
  type ToolDef,
  type ToolModule,
} from "./_helpers";
import { formatJson, formatList, toolText } from "../format";

export const teamTools: ToolModule = (ctx) => {
  const tools: ToolDef[] = [
    def({
      name: "umami_list_teams",
      description: "List teams accessible to the current user.",
      inputSchema: paginationShape,
      handler: async (args) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/teams",
          { query: args },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "name",
            "accessCode",
            "createdAt",
          ]),
        );
      },
    }),
    def({
      name: "umami_get_team",
      description: "Fetch a team by id.",
      inputSchema: { teamId: z.string() },
      handler: async ({ teamId }) => {
        const data = await ctx.client.request("GET", `/teams/${teamId}`);
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_create_team",
      description: "Create a new team.",
      inputSchema: { name: z.string() },
      handler: async (args) => {
        const data = await ctx.client.request("POST", "/teams", {
          body: args,
        });
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_update_team",
      description: "Update a team's name or access code.",
      inputSchema: {
        teamId: z.string(),
        name: z.string().optional(),
        accessCode: z.string().optional(),
      },
      handler: async ({ teamId, ...body }) => {
        const data = await ctx.client.request("POST", `/teams/${teamId}`, {
          body,
        });
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_delete_team",
      description:
        "Delete a team permanently. This cannot be undone. Confirm with the user first.",
      inputSchema: { teamId: z.string() },
      handler: async ({ teamId }) => {
        const data = await ctx.client.request("DELETE", `/teams/${teamId}`);
        return toolText(formatJson(data ?? { ok: true }));
      },
    }),
    def({
      name: "umami_list_team_members",
      description: "List members of a team.",
      inputSchema: {
        teamId: z.string(),
        ...paginationShape,
      },
      handler: async ({ teamId, ...query }) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          `/teams/${teamId}/users`,
          { query },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "username",
            "role",
          ]),
        );
      },
    }),
  ];
  return tools;
};
