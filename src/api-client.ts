import type { Config } from "./config.js"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public responseBody: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

/** Umami Cloud ingests events on its app host, not on the versioned API host. */
const CLOUD_SEND_URL = "https://cloud.umami.is/api/send"

const USER_AGENT = "Mozilla/5.0 (compatible; umami-mcp/1.0; +https://github.com/maxentr/umami-mcp)"

export class ApiClient {
  private config: Config
  private timeout: number
  private token: string | undefined

  constructor(config: Config, timeout = 20000) {
    this.config = config
    this.timeout = timeout
  }

  async request<T = unknown>(
    method: string,
    path: string,
    params?: QueryParams,
    body?: unknown,
  ): Promise<T> {
    return this.send<T>(method, this.resolvePath(path), params, body, false)
  }

  /**
   * Cloud exposes the API at /v1/<path>; self-hosted mounts it under /api/<path>.
   * Callers always pass the bare path so tools stay identical across both modes.
   */
  private resolvePath(path: string): string {
    const clean = path.startsWith("/") ? path : `/${path}`

    if (this.config.mode === "self-hosted" && !clean.startsWith("/api/")) {
      return `/api${clean}`
    }

    return clean
  }

  private async send<T>(
    method: string,
    path: string,
    params: QueryParams | undefined,
    body: unknown,
    isRetry: boolean,
  ): Promise<T> {
    const url = buildUrl(this.config.baseUrl, path, params)
    const headers = await this.authHeaders()
    headers.set("accept", "application/json")

    if (body !== undefined) {
      headers.set("content-type", "application/json")
    }

    const response = await this.fetchWithTimeout(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    // A self-hosted bearer token expires; drop it and log in again once.
    if (
      response.status === 401 &&
      this.config.mode === "self-hosted" &&
      !isRetry &&
      !path.endsWith("/auth/login")
    ) {
      this.token = undefined
      return this.send<T>(method, path, params, body, true)
    }

    if (!response.ok) {
      throw await this.toApiError(response, method, path)
    }

    return parseBody<T>(response)
  }

  /** Ingest an event. This endpoint is unauthenticated and lives outside the API prefix. */
  async sendEvent(type: string, payload: Record<string, unknown>): Promise<unknown> {
    const url = this.config.mode === "cloud" ? CLOUD_SEND_URL : `${this.config.baseUrl}/api/send`

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({ type, payload }),
    })

    if (!response.ok) {
      throw await this.toApiError(response, "POST", "/api/send")
    }

    return parseBody(response)
  }

  private async authHeaders(): Promise<Headers> {
    const headers = new Headers()

    if (this.config.mode === "cloud") {
      headers.set("x-umami-api-key", this.config.apiKey)
      return headers
    }

    if (!this.token) {
      await this.login()
    }

    headers.set("authorization", `Bearer ${this.token}`)
    return headers
  }

  private async login(): Promise<void> {
    if (this.config.mode !== "self-hosted") return

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    })

    if (!response.ok) {
      throw await this.toApiError(response, "POST", "/api/auth/login")
    }

    const data = (await response.json()) as { token?: string }

    if (!data.token) {
      throw new Error("Umami login succeeded but returned no token.")
    }

    this.token = data.token
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Umami API request timed out after ${this.timeout}ms: ${url}`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async toApiError(response: Response, method: string, path: string): Promise<ApiError> {
    const responseBody = await response.text().catch(() => response.statusText)
    let message = `Umami API error ${response.status} on ${method} ${path}`

    if (response.status === 401 || response.status === 403) {
      message = `Umami denied ${method} ${path}. Check credentials and that the account role allows this action.`
    } else if (response.status === 404) {
      message = `Umami resource not found: ${method} ${path}. Check the path and any ids in it.`
    }

    return new ApiError(message, response.status, responseBody)
  }
}

function buildUrl(baseUrl: string, path: string, params?: QueryParams): string {
  // The path is concatenated onto the base, so a path able to reopen the URL
  // authority would send Umami credentials to another host ("@evil.com/x"
  // parses as userinfo + host). resolvePath always inserts a leading slash,
  // which closes the authority and prevents this. Paths reach here from model
  // arguments, and analytics fields the model reads (titles, referrers, event
  // names) are attacker-controlled, so the invariant is asserted rather than
  // assumed and holds for any future caller that skips resolvePath.
  const url = new URL(`${baseUrl}${path}`)

  if (url.origin !== new URL(baseUrl).origin) {
    throw new Error(
      `Refusing to call ${url.origin}: path "${path}" points outside the configured Umami host.`,
    )
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function parseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return (await response.json()) as T
  }

  return (await response.text()) as unknown as T
}
