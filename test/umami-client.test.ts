import { test, expect, describe, afterEach, mock } from "bun:test";
import { UmamiClient, UmamiError } from "../src/client/umami";

type FetchCall = { url: string; init: RequestInit | undefined };

function installFetchMock(responder: (call: FetchCall) => Response) {
  const calls: FetchCall[] = [];
  const fetchMock = mock(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const call = { url, init };
    calls.push(call);
    return responder(call);
  });
  const original = globalThis.fetch;
  // biome-ignore lint: test stub
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const okJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("UmamiClient (cloud mode)", () => {
  let stub: ReturnType<typeof installFetchMock>;

  afterEach(() => stub?.restore());

  test("GET attaches x-umami-api-key header and builds URL from baseUrl + path", async () => {
    stub = installFetchMock(() => okJson({ websites: [] }));
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "secret-key",
    });

    await client.request("GET", "/websites");

    expect(stub.calls).toHaveLength(1);
    const call = stub.calls[0]!;
    expect(call.url).toBe("https://api.umami.is/v1/websites");
    expect(call.init?.method).toBe("GET");
    const headers = new Headers(call.init?.headers);
    expect(headers.get("x-umami-api-key")).toBe("secret-key");
    expect(headers.get("accept")).toBe("application/json");
  });

  test("GET with query params serializes and skips undefined", async () => {
    stub = installFetchMock(() => okJson({}));
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "k",
    });

    await client.request("GET", "/websites/abc/stats", {
      query: {
        startAt: 1000,
        endAt: 2000,
        unit: "day",
        skipMe: undefined,
      },
    });

    const url = new URL(stub.calls[0]!.url);
    expect(url.pathname).toBe("/v1/websites/abc/stats");
    expect(url.searchParams.get("startAt")).toBe("1000");
    expect(url.searchParams.get("endAt")).toBe("2000");
    expect(url.searchParams.get("unit")).toBe("day");
    expect(url.searchParams.has("skipMe")).toBe(false);
  });

  test("POST sends JSON body and content-type header", async () => {
    stub = installFetchMock(() => okJson({ id: "x" }));
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "k",
    });

    await client.request("POST", "/websites", {
      body: { name: "Acme", domain: "acme.com" },
    });

    const call = stub.calls[0]!;
    expect(call.init?.method).toBe("POST");
    const headers = new Headers(call.init?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(call.init?.body).toBe(
      JSON.stringify({ name: "Acme", domain: "acme.com" }),
    );
  });

  test("non-2xx response throws UmamiError with status and path", async () => {
    stub = installFetchMock(
      () =>
        new Response(JSON.stringify({ message: "not found" }), { status: 404 }),
    );
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "k",
    });

    let thrown: unknown;
    try {
      await client.request("GET", "/websites/nope");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(UmamiError);
    const err = thrown as UmamiError;
    expect(err.status).toBe(404);
    expect(err.method).toBe("GET");
    expect(err.path).toBe("/websites/nope");
    expect(err.message).toContain("404");
  });

  test("returns parsed JSON on success", async () => {
    stub = installFetchMock(() => okJson({ id: "w1", name: "Acme" }));
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "k",
    });

    const result = await client.request<{ id: string; name: string }>(
      "GET",
      "/websites/w1",
    );
    expect(result).toEqual({ id: "w1", name: "Acme" });
  });
});

describe("UmamiClient (self-hosted mode, auth)", () => {
  let stub: ReturnType<typeof installFetchMock>;
  afterEach(() => stub?.restore());

  test("first authed request logs in lazily and attaches bearer token", async () => {
    stub = installFetchMock((call) => {
      if (call.url.endsWith("/api/auth/login")) {
        return okJson({ token: "abc.jwt.token", user: { id: "u1" } });
      }
      return okJson({ websites: [] });
    });

    const client = new UmamiClient({
      mode: "self-hosted",
      baseUrl: "https://umami.example.com",
      username: "admin",
      password: "hunter2",
    });

    await client.request("GET", "/api/websites");

    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0]!.url).toBe("https://umami.example.com/api/auth/login");
    expect(stub.calls[0]!.init?.method).toBe("POST");
    expect(stub.calls[0]!.init?.body).toBe(
      JSON.stringify({ username: "admin", password: "hunter2" }),
    );
    expect(stub.calls[1]!.url).toBe("https://umami.example.com/api/websites");
    const headers = new Headers(stub.calls[1]!.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer abc.jwt.token");
  });

  test("token is cached across requests (only one login)", async () => {
    stub = installFetchMock((call) => {
      if (call.url.endsWith("/api/auth/login")) {
        return okJson({ token: "t", user: {} });
      }
      return okJson({});
    });

    const client = new UmamiClient({
      mode: "self-hosted",
      baseUrl: "https://u",
      username: "a",
      password: "b",
    });

    await client.request("GET", "/api/websites");
    await client.request("GET", "/api/me");
    await client.request("GET", "/api/teams");

    const logins = stub.calls.filter((c) => c.url.endsWith("/api/auth/login"));
    expect(logins).toHaveLength(1);
    expect(stub.calls).toHaveLength(4);
  });

  test("401 response triggers one re-login and retries the original request", async () => {
    let firstCall = true;
    let loginCount = 0;
    stub = installFetchMock((call) => {
      if (call.url.endsWith("/api/auth/login")) {
        loginCount++;
        return okJson({ token: `token-${loginCount}`, user: {} });
      }
      if (firstCall) {
        firstCall = false;
        return new Response("unauthorized", { status: 401 });
      }
      return okJson({ data: "ok" });
    });

    const client = new UmamiClient({
      mode: "self-hosted",
      baseUrl: "https://u",
      username: "a",
      password: "b",
    });

    const result = await client.request<{ data: string }>("GET", "/api/websites");
    expect(result).toEqual({ data: "ok" });
    expect(loginCount).toBe(2);

    const lastCall = stub.calls[stub.calls.length - 1]!;
    const h = new Headers(lastCall.init?.headers);
    expect(h.get("authorization")).toBe("Bearer token-2");
  });

  test("second 401 after re-login surfaces as UmamiError", async () => {
    stub = installFetchMock((call) => {
      if (call.url.endsWith("/api/auth/login")) {
        return okJson({ token: "t", user: {} });
      }
      return new Response("nope", { status: 401 });
    });

    const client = new UmamiClient({
      mode: "self-hosted",
      baseUrl: "https://u",
      username: "a",
      password: "b",
    });

    let err: unknown;
    try {
      await client.request("GET", "/api/websites");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UmamiError);
    expect((err as UmamiError).status).toBe(401);
  });
});

describe("UmamiClient.send (unauthenticated /api/send)", () => {
  let stub: ReturnType<typeof installFetchMock>;
  afterEach(() => stub?.restore());

  test("sends to cloud send endpoint with browser UA and no auth header", async () => {
    stub = installFetchMock(() => okJson({ ok: true }));
    const client = new UmamiClient({
      mode: "cloud",
      baseUrl: "https://api.umami.is/v1",
      apiKey: "secret",
    });

    await client.send({
      website: "w-id",
      hostname: "acme.com",
      url: "/pricing",
      name: "click-cta",
    });

    expect(stub.calls).toHaveLength(1);
    const call = stub.calls[0]!;
    expect(call.url).toBe("https://cloud.umami.is/api/send");
    expect(call.init?.method).toBe("POST");
    const headers = new Headers(call.init?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("user-agent")).toBeTruthy();
    expect(headers.has("x-umami-api-key")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
    const body = JSON.parse(call.init?.body as string);
    expect(body.type).toBe("event");
    expect(body.payload.website).toBe("w-id");
    expect(body.payload.name).toBe("click-cta");
  });

  test("self-hosted send targets ${baseUrl}/api/send", async () => {
    stub = installFetchMock(() => okJson({ ok: true }));
    const client = new UmamiClient({
      mode: "self-hosted",
      baseUrl: "https://umami.example.com",
      username: "a",
      password: "b",
    });

    await client.send({
      website: "w",
      hostname: "example.com",
      url: "/",
      name: "view",
    });

    expect(stub.calls[0]!.url).toBe("https://umami.example.com/api/send");
  });
});
