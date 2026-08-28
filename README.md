# @maxentr/umami-mcp

A Model Context Protocol (MCP) server for Umami Analytics, self-hosted or Cloud.

Seven tools cover the whole Umami API. Six are shortcuts for the questions that get asked
constantly; the seventh, `umami_api`, reaches every remaining endpoint, and `umami_catalog`
tells the model what those endpoints are.

## Installation

### Via npx (recommended)

No installation needed. Add to your MCP client config:

```json
{
  "mcpServers": {
    "umami": {
      "command": "npx",
      "args": ["-y", "@maxentr/umami-mcp"],
      "env": {
        "UMAMI_BASE_URL": "https://umami.example.com",
        "UMAMI_USERNAME": "your-user",
        "UMAMI_PASSWORD": "your-password",
        "UMAMI_DEFAULT_WEBSITE_ID": "optional-uuid"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/maxentr/umami-mcp.git
cd umami-mcp
pnpm install
pnpm run build
```

## Configuration

| Variable                   | Required    | Description                                                                                          |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `UMAMI_BASE_URL`           | self-hosted | Base URL of the Umami instance, e.g. `https://umami.example.com`                                     |
| `UMAMI_USERNAME`           | self-hosted | Umami username                                                                                       |
| `UMAMI_PASSWORD`           | self-hosted | Umami password                                                                                       |
| `UMAMI_API_KEY`            | cloud       | Umami Cloud API key. Selects Cloud mode; `UMAMI_BASE_URL` then defaults to `https://api.umami.is/v1` |
| `UMAMI_DEFAULT_WEBSITE_ID` | no          | Website uuid used when a tool call omits one                                                         |
| `UMAMI_ALLOW_WRITES`       | no          | `true` enables mutating calls and event ingestion. Off by default                                    |

Set either the self-hosted trio or `UMAMI_API_KEY`. The server reports its mode on startup.

### Writes are off by default

Umami has no undo: `DELETE /websites/{id}` and `POST /websites/{id}/reset` destroy analytics
history permanently. Without `UMAMI_ALLOW_WRITES=true` the server refuses every POST, PUT, PATCH
and DELETE, and refuses event ingestion, with an error naming the variable to set.

This is a guard, not a permission system. Umami still enforces its own role checks server-side,
so pointing the server at a `view-only` account is the stronger control and costs nothing.

## Tools

| Tool                  | What it does                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `umami_catalog`       | Lists API areas, then the endpoints and calling conventions of one area                                                      |
| `umami_api`           | Calls any endpoint. Full API coverage, including segments, boards, links, pixels, replays, shares, exports, pivots and admin |
| `list_umami_websites` | Websites this account can read, including team-owned ones                                                                    |
| `get_umami_stats`     | Pageviews, visitors, visits, bounces, time on site                                                                           |
| `get_umami_metrics`   | Top values for one dimension: pages, referrers, browsers, countries, events                                                  |
| `run_umami_report`    | Runs any of the ten report types                                                                                             |
| `send_umami_event`    | Ingests one event: pageview, custom event, identify, or Core Web Vitals                                                      |

The intended flow for anything not covered by a shortcut is
`umami_catalog` (pick an area) then `umami_api` (call it).

## Token efficiency

Tool definitions are loaded into the model's context on every single session, before it has read
the user's first message, so their size is a permanent tax. This server is built around that:

- **Seven tools, ~8.5 KB (~2,100 tokens) of definitions.** One tool per endpoint would mean
  ~150 tools and roughly 25,000 tokens; hosts also start losing selection accuracy well before
  that count.
- **Layered discovery.** `umami_catalog` with no argument returns a ~600-byte area index. Endpoint
  detail is fetched one area at a time, so a session pays only for what it uses.
- **Filters and payload fields travel as objects**, not as dozens of named schema properties. The
  field names live in descriptions and in the catalog, which cost nothing until read.
- **Responses are trimmed, not refused.** Oversized results are truncated to a token budget with a
  notice saying how many rows were dropped and how to page through the rest.
- **List calls default to `pageSize=50`** so an unbounded endpoint cannot flood the context.
- **`fields` projects columns.** Umami rows are wide; ask for the two or three columns the question
  needs.
- **Responses are compact JSON with null fields stripped.** A null key carries no more information
  than an absent one.

`pnpm run smoke` asserts the definition budget, so it cannot creep back up unnoticed.

## Development

```bash
pnpm run build     # tsc to build/
pnpm run watch     # tsc --watch
pnpm run check     # oxlint + oxfmt --check
pnpm run smoke     # boots the built server over stdio and asserts its contract
pnpm run inspector # MCP inspector against build/index.js
```

## Notes on Umami v3

Umami v3 renamed several query values. The catalog and the tool schemas carry the current
spellings; the older ones return empty results rather than errors, which is easy to miss:

- Metric and filter dimension is `path`, not `url`
- UTM fields are camelCase: `utmSource`, not `utm_source`
- Report bodies are nested: `{websiteId, type, parameters: {...}, filters: {...}}`, not flat
- Funnel and attribution step types are `path` / `event`
- Attribution models are `first-click` / `last-click`

## Credits

Forked from [Climactic/umami-mcp](https://github.com/Climactic/umami-mcp) (MIT). The transport
setup and the cloud/self-hosted split come from that project; the tool surface, catalog, guards
and token budget were rewritten.

## License

MIT
