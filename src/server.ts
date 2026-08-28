import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { ApiClient } from "./api-client.js"
import { loadConfig } from "./config.js"
import { registerAllTools } from "./tools/index.js"

const VERSION = "1.0.0"

export async function startServer() {
  const config = loadConfig()

  const server = new McpServer({
    name: "umami-mcp",
    version: VERSION,
  })

  const api = new ApiClient(config)

  registerAllTools(server, api, config)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error(
    `Umami MCP server v${VERSION} running in ${config.mode} mode at ${config.baseUrl} ` +
      `(writes ${config.allowWrites ? "enabled" : "disabled"})`,
  )
}
