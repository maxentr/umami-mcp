import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client.js"
import type { Config } from "../config.js"
import * as getUmamiMetrics from "./get-umami-metrics.js"
import * as getUmamiStats from "./get-umami-stats.js"
import * as listUmamiWebsites from "./list-umami-websites.js"
import * as runUmamiReport from "./run-umami-report.js"
import * as sendUmamiEvent from "./send-umami-event.js"
import * as umamiApi from "./umami-api.js"
import * as umamiCatalog from "./umami-catalog.js"

export function registerAllTools(server: McpServer, api: ApiClient, config: Config) {
  umamiCatalog.register(server)
  umamiApi.register(server, api, config)
  listUmamiWebsites.register(server, api, config)
  getUmamiStats.register(server, api, config)
  getUmamiMetrics.register(server, api, config)
  runUmamiReport.register(server, api, config)
  sendUmamiEvent.register(server, api, config)
}
