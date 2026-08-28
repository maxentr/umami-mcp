#!/usr/bin/env node
// Boots the built server over stdio and asserts the contract that would silently
// break things if it regressed: the tool set, catalog discovery, and the
// read-only guard that stands between an LLM and an irreversible DELETE.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"

const TOOLS = [
  "umami_catalog",
  "umami_api",
  "list_umami_websites",
  "get_umami_stats",
  "get_umami_metrics",
  "run_umami_report",
  "send_umami_event",
]

function rpc(requests, env) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["build/index.js"], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    })

    let out = ""
    child.stdout.on("data", (chunk) => (out += chunk))
    child.on("error", reject)
    child.on("close", () =>
      resolve(
        out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line)),
      ),
    )

    for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`)
    child.stdin.end()
    setTimeout(() => child.kill(), 15000)
  })
}

const init = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1" },
  },
}
const ready = { jsonrpc: "2.0", method: "notifications/initialized" }
const call = (id, name, args) => ({
  jsonrpc: "2.0",
  id,
  method: "tools/call",
  params: { name, arguments: args },
})

const env = { UMAMI_API_KEY: "smoke-key", UMAMI_DEFAULT_WEBSITE_ID: "smoke-site" }
delete process.env.UMAMI_ALLOW_WRITES

const messages = await rpc(
  [
    init,
    ready,
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    call(3, "umami_catalog", { area: "reports" }),
    call(4, "umami_api", { method: "DELETE", path: "/websites/smoke-site" }),
    call(5, "send_umami_event", { type: "event", name: "smoke" }),
    call(6, "umami_catalog", {}),
  ],
  env,
)

const byId = new Map(messages.map((m) => [m.id, m]))
const text = (id) => byId.get(id)?.result?.content?.[0]?.text ?? ""

const listed = byId.get(2).result.tools.map((t) => t.name)
assert.deepEqual(listed.sort(), [...TOOLS].sort(), "tool set changed")

const catalog = text(3)
assert.match(catalog, /reports/, "catalog did not return the reports area")
assert.match(catalog, /first-click/, "catalog lost the v3 attribution model spelling")
assert.match(catalog, /"parameters"|parameters/, "catalog lost the nested report body note")

assert.match(text(4), /read-only/, "DELETE was not blocked while writes are disabled")
assert.match(text(5), /read-only/, "ingestion was not blocked while writes are disabled")

// The whole point of the 7-tool design is that definitions stay cheap: every
// session pays this before reading the user's first message. Upstream shipped
// 48 tools at ~32KB. Guard the budget so it cannot creep back.
const schemaBytes = JSON.stringify(byId.get(2).result.tools).length
assert.ok(
  schemaBytes < 12000,
  `tools/list schema grew to ${schemaBytes} bytes (budget 12000). Collapse named params into an object or move detail into umami_catalog.`,
)

// Discovery must be layered: the index is cheap, detail is fetched per area.
const index = text(6)
assert.ok(index.length < 1200, `catalog index is ${index.length} bytes, expected a short area list`)
assert.doesNotMatch(index, /websiteId/, "catalog index leaked full endpoint detail")

assert.ok(
  byId.get(2).result.tools.every((t) => t.annotations),
  "every tool should carry annotations so clients can filter and gate them",
)

console.log(
  `ok - ${listed.length} tools, ${schemaBytes}B schema (~${Math.ceil(schemaBytes / 4)} tokens), ` +
    `layered catalog, annotations present, write guard holds`,
)
