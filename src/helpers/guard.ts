import type { Config } from "../config.js"

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase())
}

/**
 * Umami has no undo: DELETE /websites/{id} and POST /websites/{id}/reset destroy
 * analytics history permanently. Mutating calls therefore need an explicit opt-in
 * from the operator rather than a prompt-level instruction the model can ignore.
 * Server-side role checks still apply on top of this.
 */
export function assertWritesAllowed(config: Config, method: string, path: string): void {
  if (!isWriteMethod(method) || config.allowWrites) return

  throw new Error(
    `Refusing ${method.toUpperCase()} ${path}: this server is read-only. ` +
      "Set UMAMI_ALLOW_WRITES=true in the MCP server env to enable mutating calls.",
  )
}

/** Event ingestion writes rows but destroys nothing, so it is gated separately. */
export function assertIngestAllowed(config: Config): void {
  if (config.allowWrites) return

  throw new Error(
    "Refusing to ingest events: this server is read-only. " +
      "Set UMAMI_ALLOW_WRITES=true in the MCP server env to enable event ingestion.",
  )
}

export function resolveWebsiteId(provided: string | undefined, config: Config): string {
  const websiteId = provided ?? config.defaultWebsiteId

  if (!websiteId) {
    throw new Error(
      "No websiteId given and UMAMI_DEFAULT_WEBSITE_ID is not set. " +
        "Call list_umami_websites to discover website ids.",
    )
  }

  return websiteId
}
