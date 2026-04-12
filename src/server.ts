import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveConfig } from "./config";
import { UmamiClient } from "./client/umami";
import { buildTools } from "./tools";
import type { ToolContext } from "./tools/_helpers";
import pkg from "../package.json";

const PKG_NAME = pkg.name;
const PKG_VERSION = pkg.version;

export function createServer(env: Record<string, string | undefined> = process.env) {
  const cfg = resolveConfig(env);

  const client =
    cfg.mode === "cloud"
      ? new UmamiClient({
          mode: "cloud",
          baseUrl: cfg.baseUrl,
          apiKey: cfg.apiKey,
        })
      : new UmamiClient({
          mode: "self-hosted",
          baseUrl: cfg.baseUrl,
          username: cfg.username,
          password: cfg.password,
        });

  const ctx: ToolContext = {
    client,
    mode: cfg.mode,
    defaultWebsiteId: cfg.defaultWebsiteId,
  };

  const server = new McpServer({
    name: PKG_NAME,
    version: PKG_VERSION,
  });

  const tools = buildTools(ctx);
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      // biome-ignore lint: SDK types are too strict for our generic handler shape
      tool.handler as never,
    );
  }

  return { server, config: cfg, toolCount: tools.length };
}

export async function runStdio() {
  const { server, config, toolCount } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `${PKG_NAME} v${PKG_VERSION} — mode=${config.mode}, tools=${toolCount}`,
  );
}
