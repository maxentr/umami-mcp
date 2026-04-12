import { z } from "zod";
import {
  def,
  paginationShape,
  type ToolDef,
  type ToolModule,
} from "./_helpers";
import { formatJson, formatList, toolText } from "../format";

export const userTools: ToolModule = (ctx) => {
  const tools: ToolDef[] = [
    def({
      name: "umami_list_users",
      description: "List all users (self-hosted admin only).",
      inputSchema: paginationShape,
      handler: async (args) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/admin/users",
          { query: args },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "username",
            "role",
            "createdAt",
          ]),
        );
      },
    }),
    def({
      name: "umami_create_user",
      description: "Create a new user (self-hosted admin only).",
      inputSchema: {
        username: z.string(),
        password: z.string(),
        role: z.enum(["admin", "user", "view-only"]).describe("User role."),
      },
      handler: async (args) => {
        const data = await ctx.client.request("POST", "/users", {
          body: args,
        });
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_delete_user",
      description:
        "Delete a user (self-hosted admin only). Permanent. Confirm with the user first.",
      inputSchema: { userId: z.string() },
      handler: async ({ userId }) => {
        const data = await ctx.client.request("DELETE", `/users/${userId}`);
        return toolText(formatJson(data ?? { ok: true }));
      },
    }),
  ];
  return tools;
};
