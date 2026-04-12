export class UmamiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly body: string | undefined;

  constructor(opts: {
    status: number;
    method: string;
    path: string;
    body?: string;
  }) {
    super(
      `Umami API error (HTTP ${opts.status}) ${opts.method} ${opts.path}${
        opts.body ? `: ${opts.body}` : ""
      }`,
    );
    this.name = "UmamiError";
    this.status = opts.status;
    this.method = opts.method;
    this.path = opts.path;
    this.body = opts.body;
  }
}

export type CloudOpts = {
  mode: "cloud";
  baseUrl: string;
  apiKey: string;
};

export type SelfHostedOpts = {
  mode: "self-hosted";
  baseUrl: string;
  username: string;
  password: string;
};

export type ClientOpts = CloudOpts | SelfHostedOpts;

export type RequestOpts = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

export type SendEventPayload = {
  website: string;
  hostname?: string;
  language?: string;
  referrer?: string;
  screen?: string;
  title?: string;
  url?: string;
  name?: string;
  data?: Record<string, unknown>;
  tag?: string;
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; umami-mcp/0.1; +https://github.com/climactic/umami-mcp)";

const SEND_HOST_CLOUD = "https://cloud.umami.is";

function buildUrl(
  baseUrl: string,
  path: string,
  query: RequestOpts["query"],
): string {
  const url = new URL(
    path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export class UmamiClient {
  private readonly opts: ClientOpts;
  private token: string | undefined;

  constructor(opts: ClientOpts) {
    this.opts = opts;
  }

  private resolvePath(path: string): string {
    if (this.opts.mode === "self-hosted" && !path.startsWith("/api/")) {
      return `/api${path.startsWith("/") ? "" : "/"}${path}`;
    }
    return path;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    opts: RequestOpts = {},
  ): Promise<T> {
    return this.doRequest<T>(method, this.resolvePath(path), opts, false);
  }

  private async doRequest<T>(
    method: string,
    path: string,
    opts: RequestOpts,
    isRetry: boolean,
  ): Promise<T> {
    const url = buildUrl(this.opts.baseUrl, path, opts.query);
    const headers = await this.buildAuthHeaders();
    headers.set("accept", "application/json");
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers.set("content-type", "application/json");
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetch(url, init);

    if (
      res.status === 401 &&
      this.opts.mode === "self-hosted" &&
      !isRetry &&
      !path.endsWith("/auth/login")
    ) {
      this.token = undefined;
      return this.doRequest<T>(method, path, opts, true);
    }

    if (!res.ok) {
      let bodyText: string | undefined;
      try {
        bodyText = await res.text();
      } catch {
        bodyText = undefined;
      }
      throw new UmamiError({
        status: res.status,
        method,
        path,
        body: bodyText,
      });
    }

    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  private async buildAuthHeaders(): Promise<Headers> {
    const h = new Headers();
    if (this.opts.mode === "cloud") {
      h.set("x-umami-api-key", this.opts.apiKey);
      return h;
    }
    if (!this.token) {
      await this.login();
    }
    h.set("authorization", `Bearer ${this.token}`);
    return h;
  }

  private async login(): Promise<void> {
    if (this.opts.mode !== "self-hosted") return;
    const url = buildUrl(this.opts.baseUrl, "/api/auth/login", undefined);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        username: this.opts.username,
        password: this.opts.password,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new UmamiError({
        status: res.status,
        method: "POST",
        path: "/api/auth/login",
        body,
      });
    }
    const data = (await res.json()) as { token: string };
    this.token = data.token;
  }

  async send(payload: SendEventPayload): Promise<unknown> {
    const sendUrl =
      this.opts.mode === "cloud"
        ? `${SEND_HOST_CLOUD}/api/send`
        : `${this.opts.baseUrl}/api/send`;

    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({ type: "event", payload }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new UmamiError({
        status: res.status,
        method: "POST",
        path: "/api/send",
        body,
      });
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  }
}
