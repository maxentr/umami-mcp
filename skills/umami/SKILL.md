---
name: umami-analytics
description: Use when the user asks about website traffic, pageviews, visitors, referrers, top pages, bounce rate, conversion funnels, retention, UTM campaigns, or any question answerable from Umami Analytics data. Also use when they mention "Umami" by name.
---

# Umami Analytics

This skill is backed by the @climactic/umami-mcp server. When active,
you have ~48 tools prefixed `umami_*`.

## Quick routing

- "How much traffic..." / "pageviews" → `umami_get_stats` or `umami_get_pageviews`
- "Who's on the site right now" → `umami_get_active_users` / `umami_get_realtime`
- "Top pages / referrers / countries / browsers" → `umami_get_metrics` with appropriate `type`
- "Funnel / retention / UTM / goals / journey" → `umami_report_*`
- "What events fired" → `umami_list_events` / `umami_get_event_stats`
- Unknown website → call `umami_list_websites` first
- Dates: accept ISO strings from the user, pass ms-epoch or ISO strings to tools (they accept both)

## Defaults

If `UMAMI_DEFAULT_WEBSITE_ID` is set in the user's env, omit `websiteId`
from tool calls unless they ask about a different site.

## Don't

- Don't guess website IDs — call `umami_list_websites` or `umami_list_my_websites` first.
- Don't call write tools (create/update/delete/reset/send) without explicit user confirmation. They mutate the Umami account.
