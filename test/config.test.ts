import { test, expect, describe } from "bun:test";
import { resolveConfig, ConfigError } from "../src/config";

describe("resolveConfig", () => {
  test("cloud mode: api key only → defaults base url to api.umami.is/v1", () => {
    const cfg = resolveConfig({ UMAMI_API_KEY: "secret" });
    expect(cfg.mode).toBe("cloud");
    expect(cfg.baseUrl).toBe("https://api.umami.is/v1");
    if (cfg.mode !== "cloud") throw new Error("expected cloud");
    expect(cfg.apiKey).toBe("secret");
    expect(cfg.defaultWebsiteId).toBeUndefined();
  });

  test("cloud mode: api key with explicit base url override", () => {
    const cfg = resolveConfig({
      UMAMI_API_KEY: "secret",
      UMAMI_BASE_URL: "https://api.umami.is/eu",
    });
    expect(cfg.mode).toBe("cloud");
    expect(cfg.baseUrl).toBe("https://api.umami.is/eu");
  });

  test("cloud mode: strips trailing slash from base url", () => {
    const cfg = resolveConfig({
      UMAMI_API_KEY: "secret",
      UMAMI_BASE_URL: "https://api.umami.is/v1/",
    });
    expect(cfg.baseUrl).toBe("https://api.umami.is/v1");
  });

  test("self-hosted mode: username + password + base url", () => {
    const cfg = resolveConfig({
      UMAMI_USERNAME: "admin",
      UMAMI_PASSWORD: "hunter2",
      UMAMI_BASE_URL: "https://umami.example.com",
    });
    expect(cfg.mode).toBe("self-hosted");
    expect(cfg.baseUrl).toBe("https://umami.example.com");
    if (cfg.mode !== "self-hosted") throw new Error("expected self-hosted");
    expect(cfg.username).toBe("admin");
    expect(cfg.password).toBe("hunter2");
  });

  test("default website id threads through both modes", () => {
    const cloud = resolveConfig({
      UMAMI_API_KEY: "k",
      UMAMI_DEFAULT_WEBSITE_ID: "abc-123",
    });
    expect(cloud.defaultWebsiteId).toBe("abc-123");

    const self = resolveConfig({
      UMAMI_USERNAME: "u",
      UMAMI_PASSWORD: "p",
      UMAMI_BASE_URL: "https://x",
      UMAMI_DEFAULT_WEBSITE_ID: "abc-123",
    });
    expect(self.defaultWebsiteId).toBe("abc-123");
  });

  test("cloud mode wins when both api key and username are set", () => {
    const cfg = resolveConfig({
      UMAMI_API_KEY: "k",
      UMAMI_USERNAME: "u",
      UMAMI_PASSWORD: "p",
      UMAMI_BASE_URL: "https://x",
    });
    expect(cfg.mode).toBe("cloud");
  });

  test("self-hosted requires base url", () => {
    expect(() =>
      resolveConfig({ UMAMI_USERNAME: "u", UMAMI_PASSWORD: "p" }),
    ).toThrow(ConfigError);
  });

  test("self-hosted requires password", () => {
    expect(() =>
      resolveConfig({
        UMAMI_USERNAME: "u",
        UMAMI_BASE_URL: "https://x",
      }),
    ).toThrow(ConfigError);
  });

  test("empty env throws ConfigError with hint listing both modes", () => {
    expect(() => resolveConfig({})).toThrow(ConfigError);
    try {
      resolveConfig({});
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("UMAMI_API_KEY");
      expect(msg).toContain("UMAMI_USERNAME");
      expect(msg).toContain("UMAMI_BASE_URL");
    }
  });
});
