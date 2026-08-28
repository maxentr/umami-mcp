export interface CloudConfig {
  mode: "cloud"
  baseUrl: string
  apiKey: string
  defaultWebsiteId?: string
  allowWrites: boolean
}

export interface SelfHostedConfig {
  mode: "self-hosted"
  baseUrl: string
  username: string
  password: string
  defaultWebsiteId?: string
  allowWrites: boolean
}

export type Config = CloudConfig | SelfHostedConfig

const CLOUD_BASE_URL = "https://api.umami.is/v1"

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.UMAMI_API_KEY
  const username = env.UMAMI_USERNAME
  const password = env.UMAMI_PASSWORD
  const rawBaseUrl = env.UMAMI_BASE_URL
  const defaultWebsiteId = env.UMAMI_DEFAULT_WEBSITE_ID
  const allowWrites = env.UMAMI_ALLOW_WRITES === "true"

  if (apiKey) {
    return {
      mode: "cloud",
      baseUrl: normalizeBaseUrl(rawBaseUrl ?? CLOUD_BASE_URL),
      apiKey,
      defaultWebsiteId,
      allowWrites,
    }
  }

  if (username || password || rawBaseUrl) {
    if (!username || !password || !rawBaseUrl) {
      throw new Error(
        "Self-hosted mode requires UMAMI_USERNAME, UMAMI_PASSWORD and UMAMI_BASE_URL to all be set.",
      )
    }

    return {
      mode: "self-hosted",
      baseUrl: normalizeBaseUrl(rawBaseUrl),
      username,
      password,
      defaultWebsiteId,
      allowWrites,
    }
  }

  throw new Error(
    [
      "No Umami credentials found. Set one of:",
      "  Cloud:       UMAMI_API_KEY (optional: UMAMI_BASE_URL)",
      "  Self-hosted: UMAMI_USERNAME + UMAMI_PASSWORD + UMAMI_BASE_URL",
      "Optional: UMAMI_DEFAULT_WEBSITE_ID, UMAMI_ALLOW_WRITES=true",
    ].join("\n"),
  )
}

function normalizeBaseUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid UMAMI_BASE_URL format: ${url}`)
  }

  return parsed.toString().replace(/\/+$/, "")
}
