/**
 * Index of the Umami HTTP API, grouped by area.
 *
 * Paths are written without the mount prefix: ApiClient adds /api for self-hosted
 * and leaves Cloud's /v1 base intact. `{...}` marks a path parameter.
 *
 * Regenerate the path/method list against a checkout of umami-software/umami with:
 *   for f in $(find src/app/api -name route.ts | sort); do p=${f#src/app}; p=${p%/route.ts};
 *   m=$(grep -oE '^export (async )?function (GET|POST|PUT|DELETE|PATCH)' "$f" |
 *   grep -oE '(GET|POST|PUT|DELETE|PATCH)' | tr '\n' ','); echo "$m $p"; done
 */

export interface Endpoint {
  methods: string[]
  path: string
  note: string
}

export const AREAS = [
  "websites",
  "stats",
  "events",
  "sessions",
  "reports",
  "segments",
  "boards",
  "links",
  "pixels",
  "replays",
  "shares",
  "teams",
  "users",
  "admin",
  "ingest",
  "misc",
] as const

export type Area = (typeof AREAS)[number]

/**
 * Umami v3 renamed several query values from v2. The wrong spelling returns 400
 * or an empty result rather than an error, so the correct ones are pinned here.
 */
export const CONVENTIONS = {
  dateRange:
    "Every analytics endpoint needs a date range: either startAt+endAt (epoch milliseconds) or startDate+endDate (ISO). Optional: unit (minute|hour|day|month|year), timezone (IANA), compare (prev|yoy).",
  metricTypes:
    "metrics `type` is one of: path, fullPath, entry, exit, referrer, domain, title, query, event, tag, hostname, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, browser, os, device, screen, language, country, region, city, distinctId, channel. Note v3 uses `path`, NOT `url`, and camelCase `utmSource`, NOT `utm_source`.",
  filters:
    "Filter params usable on most analytics endpoints: path, referrer, title, query, os, browser, device, country, region, city, tag, hostname, distinctId, language, event, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, segment (uuid), cohort (uuid), eventType (int), excludeBounce, match (all|any).",
  paging:
    "Paging params: page, pageSize, maxResults, search, orderBy, sortDescending (true|false).",
  reportBody:
    'Report endpoints take a nested body, NOT flat fields: {"websiteId": uuid, "filters": {...}, "type": "<report type>", "parameters": {...}}. The parameters object differs per report type.',
  reportTypes:
    "Report types: attribution, breakdown, funnel, goal, heatmap, journey, performance, retention, revenue, utm.",
  reportParameters: [
    'funnel: {startDate, endDate, window (minutes), steps: [{type: "path"|"event", value, filters?}] (2-8 steps)}',
    "goal: {startDate, endDate, type, value}",
    "journey: {startDate, endDate, steps (2-7), startStep?, endStep?, eventType?}",
    "retention: {startDate, endDate, timezone?}",
    "utm: {startDate, endDate}",
    'performance: {startDate, endDate, unit?, timezone?, metric?: "lcp"|"inp"|"cls"|"fcp"|"ttfb"}',
    "revenue: {startDate, endDate, currency, unit?, timezone?, compare?}",
    'attribution: {startDate, endDate, model: "first-click"|"last-click", type: "path"|"event", step, currency?}',
    "breakdown: {startDate, endDate, fields: [<filter field names>]}",
    'heatmap: {startDate, endDate, urlPath?, mode?: "click"|"scroll"}',
  ].join("\n  "),
} as const

export const CATALOG: Record<Area, Endpoint[]> = {
  websites: [
    { methods: ["GET", "POST"], path: "/websites", note: "List websites; create a website" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/websites/{websiteId}",
      note: "Read, update (POST), delete a website",
    },
    {
      methods: ["GET"],
      path: "/websites/charts",
      note: "Sparkline data for many websites at once",
    },
    {
      methods: ["POST"],
      path: "/websites/{websiteId}/reset",
      note: "Wipe all analytics data, keep the website. Irreversible",
    },
    {
      methods: ["POST"],
      path: "/websites/{websiteId}/transfer",
      note: "Transfer ownership to a user or team",
    },
    { methods: ["GET"], path: "/websites/{websiteId}/export", note: "Export raw event data" },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/values",
      note: "Distinct values for a filter field. Needs `type`",
    },
    { methods: ["GET"], path: "/me/websites", note: "Websites owned by the current user" },
    { methods: ["GET"], path: "/teams/{teamId}/websites", note: "Websites owned by a team" },
    {
      methods: ["GET"],
      path: "/users/{userId}/websites",
      note: "Websites owned by a user (admin)",
    },
  ],
  stats: [
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/stats",
      note: "Totals: pageviews, visitors, visits, bounces, totaltime",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/pageviews",
      note: "Pageview/session time series. Needs unit",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/metrics",
      note: "Top N by dimension. Needs `type` (see conventions.metricTypes)",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/metrics/expanded",
      note: "Metrics with extra per-row columns",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/active",
      note: "Visitors active in the last 5 minutes",
    },
    {
      methods: ["GET"],
      path: "/realtime/{websiteId}",
      note: "Realtime feed for the last 30 minutes",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/daterange",
      note: "Earliest and latest event timestamps",
    },
    { methods: ["GET"], path: "/websites/{websiteId}/revenue/stats", note: "Revenue totals" },
    { methods: ["GET"], path: "/websites/{websiteId}/revenue/chart", note: "Revenue time series" },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/revenue/metrics",
      note: "Revenue grouped by dimension",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/revenue/sessions",
      note: "Revenue attributed per session",
    },
  ],
  events: [
    { methods: ["GET"], path: "/websites/{websiteId}/events", note: "Raw event rows, paged" },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/events/series",
      note: "Event counts over time. Needs unit",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/events/stats",
      note: "Aggregate event totals",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data",
      note: "Event rows joined with their custom properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/events",
      note: "Distinct event names",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/fields",
      note: "Custom property field names and counts",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/properties",
      note: "Event names with property counts",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/values",
      note: "Value counts. Needs event + propertyName",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/stats",
      note: "Totals across event data",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data/{eventId}",
      note: "Properties of one event row",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot",
      note: "Pivot event properties into a table",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot/array-series",
      note: "Pivot series for array properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot/date-series",
      note: "Pivot series for date properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot/numeric-series",
      note: "Pivot series for numeric properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot/numeric-stats",
      note: "min/max/avg/sum for a numeric property",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/event-data-pivot/property-series",
      note: "Pivot series for string properties",
    },
  ],
  sessions: [
    { methods: ["GET"], path: "/websites/{websiteId}/sessions", note: "Session rows, paged" },
    {
      methods: ["GET", "DELETE"],
      path: "/websites/{websiteId}/sessions/{sessionId}",
      note: "Read or delete one session",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/sessions/stats",
      note: "Session-level aggregates",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/sessions/weekly",
      note: "Sessions by weekday and hour",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/sessions/{sessionId}/activity",
      note: "Event timeline for one session",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/sessions/{sessionId}/properties",
      note: "Custom properties of one session",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/sessions/{sessionId}/replays",
      note: "Replays recorded for one session",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/properties",
      note: "Session property names and counts",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/values",
      note: "Value counts. Needs propertyName",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/stats",
      note: "Totals across session data",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/array-series",
      note: "Series for array session properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/date-series",
      note: "Series for date session properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/numeric-series",
      note: "Series for numeric session properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/numeric-stats",
      note: "min/max/avg/sum for a numeric session property",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data/property-series",
      note: "Series for string session properties",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/session-data-pivot",
      note: "Pivot session properties into a table",
    },
  ],
  reports: [
    { methods: ["GET", "POST"], path: "/reports", note: "List saved reports; save a new report" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/reports/{reportId}",
      note: "Read, update, delete a saved report",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/reports",
      note: "Saved reports for one website",
    },
    { methods: ["POST"], path: "/reports/attribution", note: "Run an attribution report" },
    { methods: ["POST"], path: "/reports/breakdown", note: "Run a breakdown report" },
    { methods: ["POST"], path: "/reports/funnel", note: "Run a funnel report" },
    { methods: ["POST"], path: "/reports/goal", note: "Run a goal report" },
    { methods: ["POST"], path: "/reports/heatmap", note: "Run a click/scroll heatmap report" },
    { methods: ["POST"], path: "/reports/journey", note: "Run a user journey report" },
    { methods: ["POST"], path: "/reports/performance", note: "Run a Core Web Vitals report" },
    { methods: ["POST"], path: "/reports/retention", note: "Run a retention cohort report" },
    { methods: ["POST"], path: "/reports/revenue", note: "Run a revenue report" },
    { methods: ["POST"], path: "/reports/utm", note: "Run a UTM campaign report" },
  ],
  segments: [
    {
      methods: ["GET", "POST"],
      path: "/websites/{websiteId}/segments",
      note: "List segments/cohorts; create one",
    },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/websites/{websiteId}/segments/{segmentId}",
      note: "Read, update, delete a segment",
    },
  ],
  boards: [
    { methods: ["GET", "POST"], path: "/boards", note: "List dashboards; create one" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/boards/{boardId}",
      note: "Read, update, delete a dashboard",
    },
    { methods: ["POST"], path: "/boards/{boardId}/clone", note: "Duplicate a dashboard" },
    {
      methods: ["GET", "POST"],
      path: "/boards/{boardId}/shares",
      note: "List or create share links for a dashboard",
    },
    { methods: ["GET"], path: "/teams/{teamId}/boards", note: "Dashboards owned by a team" },
    { methods: ["GET", "POST"], path: "/dashboard", note: "Current user's dashboard layout" },
  ],
  links: [
    { methods: ["GET", "POST"], path: "/links", note: "List short links; create one" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/links/{linkId}",
      note: "Read, update, delete a short link",
    },
    { methods: ["GET"], path: "/links/charts", note: "Click sparklines for many links" },
    {
      methods: ["GET", "POST"],
      path: "/links/{linkId}/shares",
      note: "Share links for a short link",
    },
    { methods: ["GET"], path: "/teams/{teamId}/links", note: "Short links owned by a team" },
  ],
  pixels: [
    { methods: ["GET", "POST"], path: "/pixels", note: "List tracking pixels; create one" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/pixels/{pixelId}",
      note: "Read, update, delete a pixel",
    },
    { methods: ["GET"], path: "/pixels/charts", note: "Hit sparklines for many pixels" },
    { methods: ["GET", "POST"], path: "/pixels/{pixelId}/shares", note: "Share links for a pixel" },
    { methods: ["GET"], path: "/teams/{teamId}/pixels", note: "Pixels owned by a team" },
  ],
  replays: [
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/replays",
      note: "List session replays. Optional minDuration",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/replays/{replayId}",
      note: "Fetch one replay. Large payload",
    },
    { methods: ["GET"], path: "/websites/{websiteId}/replays/saved", note: "List saved replays" },
    {
      methods: ["GET", "POST"],
      path: "/websites/{websiteId}/replays/saved/{replayId}",
      note: "Read or save a replay",
    },
    {
      methods: ["GET"],
      path: "/websites/{websiteId}/recorder",
      note: "Recorder configuration for a website",
    },
  ],
  shares: [
    { methods: ["POST"], path: "/share", note: "Create a share link" },
    { methods: ["GET"], path: "/share/{slug}", note: "Resolve a public share slug" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/share/id/{shareId}",
      note: "Read, update, revoke a share link",
    },
    {
      methods: ["GET", "POST"],
      path: "/websites/{websiteId}/shares",
      note: "Share links for a website",
    },
  ],
  teams: [
    { methods: ["GET", "POST"], path: "/teams", note: "List teams; create a team" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/teams/{teamId}",
      note: "Read, update, delete a team",
    },
    { methods: ["POST"], path: "/teams/join", note: "Join a team with an access code" },
    { methods: ["GET", "POST"], path: "/teams/{teamId}/users", note: "List members; add a member" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/teams/{teamId}/users/{userId}",
      note: "Read, change role, remove a member",
    },
    { methods: ["GET"], path: "/me/teams", note: "Teams the current user belongs to" },
    { methods: ["GET"], path: "/users/{userId}/teams", note: "Teams a user belongs to (admin)" },
  ],
  users: [
    { methods: ["GET"], path: "/me", note: "The authenticated user" },
    { methods: ["POST"], path: "/me/password", note: "Change the current user's password" },
    { methods: ["POST"], path: "/users", note: "Create a user. Roles: admin, user, view-only" },
    {
      methods: ["GET", "POST", "DELETE"],
      path: "/users/{userId}",
      note: "Read, update, delete a user",
    },
  ],
  admin: [
    { methods: ["GET"], path: "/admin/users", note: "List every user on the instance" },
    { methods: ["GET"], path: "/admin/teams", note: "List every team on the instance" },
    { methods: ["GET"], path: "/admin/websites", note: "List every website on the instance" },
  ],
  ingest: [
    {
      methods: ["POST"],
      path: "/send",
      note: 'Ingest one event. Use the send_umami_event tool. type: "event"|"identify"|"performance"',
    },
    { methods: ["POST"], path: "/batch", note: "Ingest up to 500 events. Self-hosted only" },
    { methods: ["POST"], path: "/record", note: "Ingest session replay data" },
  ],
  misc: [
    { methods: ["GET"], path: "/config", note: "Public instance configuration" },
    { methods: ["GET"], path: "/heartbeat", note: "Liveness probe" },
  ],
}

export function listAreas(): string[] {
  return AREAS.map((area) => `${area} (${CATALOG[area].length})`)
}

export function endpointsFor(area?: string): Record<string, Endpoint[]> {
  if (!area) return CATALOG

  const key = area.toLowerCase() as Area

  if (!AREAS.includes(key)) {
    throw new Error(`Unknown area "${area}". Known areas: ${AREAS.join(", ")}`)
  }

  return { [key]: CATALOG[key] }
}
