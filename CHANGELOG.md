# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-28

Initial release under `@maxentr`. Forked from
[Climactic/umami-mcp](https://github.com/Climactic/umami-mcp) `0.1.2` (MIT) and rewritten.

### Added

- MCP server for Umami Analytics, self-hosted and Cloud.
- Seven tools: `umami_catalog`, `umami_api`, `list_umami_websites`, `get_umami_stats`,
  `get_umami_metrics`, `run_umami_report`, `send_umami_event`.
- `umami_api` reaches every Umami endpoint, including the areas the previous tool set never
  exposed: segments, boards, links, pixels, replays, shares, exports, event-data and
  session-data pivots, and admin listings.
- `umami_catalog` documents 112 endpoints across 16 areas, verified to exist in Umami 3.3.1,
  together with the calling conventions (date range, metric types, filter fields, report bodies).
- `send_umami_event` covers all three collection types — `event` (pageview and custom event),
  `identify`, and `performance` (Core Web Vitals) — plus link and pixel sources. The previous
  tool set could only produce pageviews and custom events.
- `run_umami_report` supports all ten report types, including `heatmap`.
- `UMAMI_ALLOW_WRITES` (default off) gates every mutating call and event ingestion.
- Request timeouts (20s) on every call, with a clear timeout error.
- `scripts/smoke.mjs`: boots the built server over stdio and asserts the tool set, the layered
  catalog, the write guard, tool annotations, and the tool-definition size budget.

### Fixed

Request shapes corrected for Umami v3. The previous tool set sent v2 shapes, which v3 answers
with empty results rather than errors, so these failed silently:

- Metric and filter dimension is `path`, not `url`.
- UTM fields are camelCase (`utmSource`), not snake_case (`utm_source`).
- Report bodies nest under `parameters` with `websiteId`/`type`/`filters` alongside, rather than
  being flattened onto the request root.
- Funnel and attribution step types are `path` / `event`, not `url` / `event`.
- Attribution models are `first-click` / `last-click`, not `firstClick` / `lastClick`.

Also fixed:

- Team websites are now fetched concurrently instead of one serial request per team.

### Changed

- **Tool definitions cut 73.5%**: 48 tools / 32,100 bytes (~8,025 tokens) → 7 tools / 8,499 bytes
  (~2,125 tokens), while API coverage went from roughly a quarter of the API to all of it. Tool
  definitions are loaded into context in every session before the model reads anything, so this
  is a per-session saving.
- Layered endpoint discovery: `umami_catalog` with no argument returns a ~600-byte area index;
  endpoint detail is fetched one area at a time.
- Filters (22 fields) and event payload attributes (17 fields) travel as single object parameters
  instead of named schema properties. The field names live in descriptions and in the catalog,
  where they cost nothing until read.
- Responses are truncated to a token budget with a notice giving the dropped row count and how to
  page, instead of refusing oversized results.
- List calls default to `pageSize=50` so an unbounded endpoint cannot flood the context.
- `umami_api` takes a `fields` array to project columns; Umami rows are wide.
- Responses serialize as compact JSON with `null`/`undefined` stripped recursively (`false`, `0`,
  `""`, `[]`, `{}` preserved). Previously each list tool emitted a Markdown table _and_ the same
  rows again as pretty-printed JSON.
- Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`,
  `openWorldHint`) so hosts can filter and gate them.
- The built URL's origin is asserted against the configured base URL on every request.

### Tooling

- Rebuilt on Node + pnpm + `tsc` to `build/`, published as compiled JavaScript with a
  `#!/usr/bin/env node` shebang. The upstream package shipped TypeScript with a `bun` shebang and
  extensionless imports, so `npx` could not run it — only `bunx`.
- oxlint + oxfmt, lefthook git hooks (pre-commit lint/format, pre-push typecheck).
- `engines.node >= 18`.

[1.0.0]: https://github.com/maxentr/umami-mcp/releases/tag/v1.0.0
