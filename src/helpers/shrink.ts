import { estimateTokens } from "./result.js"

/** Rows past this point are dropped rather than spent on the model's context. */
export const DEFAULT_MAX_TOKENS = 8000

/**
 * Keep only the named keys on each row. Umami rows are wide (a session carries
 * ~25 columns), and a question usually needs two or three of them, so
 * projecting server-side avoids paying for the rest.
 */
export function projectFields(data: unknown, fields: string[]): unknown {
  if (fields.length === 0) return data

  const pick = (row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row

    const out: Record<string, unknown> = {}
    for (const field of fields) {
      if (field in (row as Record<string, unknown>)) {
        out[field] = (row as Record<string, unknown>)[field]
      }
    }
    return out
  }

  if (Array.isArray(data)) return data.map(pick)

  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)) {
    return { ...data, data: (data as { data: unknown[] }).data.map(pick) }
  }

  return pick(data)
}

export interface ShrinkResult {
  data: unknown
  notice?: string
}

/**
 * Trim an oversized payload to fit a token budget. Arrays lose their tail and
 * say so, because a truncated list the model knows is truncated is far more
 * useful than a refusal it has to work around.
 */
export function shrinkToBudget(data: unknown, maxTokens = DEFAULT_MAX_TOKENS): ShrinkResult {
  const tokens = estimateTokens(data)

  if (tokens <= maxTokens) return { data }

  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: unknown[] }).data
      : undefined

  if (!rows || rows.length === 0) {
    return {
      data,
      notice: `Response is ~${tokens} tokens and could not be trimmed automatically. Narrow the date range or add filters.`,
    }
  }

  const keep = Math.max(1, Math.floor(rows.length * (maxTokens / tokens)))
  const kept = rows.slice(0, keep)
  const notice = `Truncated: showing ${kept.length} of ${rows.length} rows (~${tokens} tokens unfiltered). Use page/pageSize or limit to page through the rest, or add filters to narrow it.`

  if (Array.isArray(data)) return { data: kept, notice }

  return { data: { ...(data as object), data: kept }, notice }
}
