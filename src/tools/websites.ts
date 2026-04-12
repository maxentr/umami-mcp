import { z } from "zod";
import {
  def,
  makeWebsiteIdArg,
  paginationShape,
  resolveWebsiteId,
  type ToolDef,
  type ToolModule,
} from "./_helpers";
import { formatJson, formatList, toolText } from "../format";

export const websiteTools: ToolModule = (ctx) => {
  const tools: ToolDef[] = [
    def({
      name: "umami_list_websites",
      description:
        "List all Umami websites accessible to the current user. Returns id, name, domain, createdAt for each.",
      inputSchema: {
        ...paginationShape,
        includeTeams: z
          .boolean()
          .default(true)
          .describe("Include team-owned websites in the result. Defaults to true."),
      },
      handler: async (args) => {
        const data = await ctx.client.request<{ data?: unknown[] }>(
          "GET",
          "/websites",
          { query: args },
        );
        const rows = Array.isArray(data) ? data : data.data ?? [];
        return toolText(
          formatList(rows as Record<string, unknown>[], [
            "id",
            "name",
            "domain",
            "createdAt",
          ]),
        );
      },
    }),
    def({
      name: "umami_get_website",
      description: "Fetch one Umami website by id.",
      inputSchema: { websiteId: makeWebsiteIdArg() },
      handler: async (args) => {
        const id = resolveWebsiteId(args.websiteId, ctx.defaultWebsiteId);
        const data = await ctx.client.request("GET", `/websites/${id}`);
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_create_website",
      description: "Create a new website.",
      inputSchema: {
        name: z.string().describe("Display name."),
        domain: z.string().describe("Domain, e.g. example.com."),
        shareId: z.string().optional(),
        teamId: z.string().optional(),
      },
      handler: async (args) => {
        const data = await ctx.client.request("POST", "/websites", {
          body: args,
        });
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_update_website",
      description: "Update a website's name, domain, or share id.",
      inputSchema: {
        websiteId: makeWebsiteIdArg(),
        name: z.string().optional(),
        domain: z.string().optional(),
        shareId: z.string().optional(),
      },
      handler: async (args) => {
        const id = resolveWebsiteId(args.websiteId, ctx.defaultWebsiteId);
        const { websiteId: _, ...body } = args;
        const data = await ctx.client.request("POST", `/websites/${id}`, {
          body,
        });
        return toolText(formatJson(data));
      },
    }),
    def({
      name: "umami_delete_website",
      description:
        "DELETE a website permanently. This cannot be undone. Confirm with the user first.",
      inputSchema: { websiteId: makeWebsiteIdArg() },
      handler: async (args) => {
        const id = resolveWebsiteId(args.websiteId, ctx.defaultWebsiteId);
        const data = await ctx.client.request("DELETE", `/websites/${id}`);
        return toolText(formatJson(data ?? { ok: true }));
      },
    }),
    def({
      name: "umami_reset_website",
      description:
        "Wipe all analytics data for a website while keeping it configured. Irreversible. Confirm with the user first.",
      inputSchema: { websiteId: makeWebsiteIdArg() },
      handler: async (args) => {
        const id = resolveWebsiteId(args.websiteId, ctx.defaultWebsiteId);
        const data = await ctx.client.request("POST", `/websites/${id}/reset`);
        return toolText(formatJson(data ?? { ok: true }));
      },
    }),
  ];
  return tools;
};
