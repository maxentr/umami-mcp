import { z } from "zod"

/**
 * Umami accepts either startAt/endAt (epoch ms) or startDate/endDate (ISO) and
 * rejects a request carrying neither. ISO strings are coerced to epoch ms here
 * so the model can pass whichever form it has.
 */
const dateValue = z.union([z.number().int(), z.string()]).transform((value, ctx) => {
  if (typeof value === "number") return value

  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) {
    ctx.addIssue({ code: "custom", message: `Invalid date: ${value}` })
    return z.NEVER
  }

  return parsed
})

export const websiteIdParam = z
  .string()
  .optional()
  .describe("Website uuid. Defaults to UMAMI_DEFAULT_WEBSITE_ID.")

export const dateRangeShape = {
  startAt: dateValue.describe("Range start. Epoch milliseconds, or an ISO date string."),
  endAt: dateValue.describe("Range end. Epoch milliseconds, or an ISO date string."),
}

/**
 * Filters travel as one object rather than 22 named properties. Each named
 * property costs schema bytes in every tools/list for every tool that spreads
 * it; the field names live in the description and in umami_catalog instead.
 * v3 uses `path`, not `url`, and camelCase utm fields.
 */
export const FILTER_FIELDS = [
  "path",
  "referrer",
  "title",
  "query",
  "event",
  "hostname",
  "os",
  "browser",
  "device",
  "country",
  "region",
  "city",
  "language",
  "tag",
  "distinctId",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "segment",
  "cohort",
] as const

export const filtersParam = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .optional()
  .describe(`Optional filters, as an object. Fields: ${FILTER_FIELDS.join(", ")}.`)

export function toQueryParams(
  input: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue
    params[key] = value as string | number | boolean
  }

  return params
}
