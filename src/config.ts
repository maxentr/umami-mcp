export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type UmamiConfig =
  | {
      mode: "cloud";
      baseUrl: string;
      apiKey: string;
      defaultWebsiteId?: string;
    }
  | {
      mode: "self-hosted";
      baseUrl: string;
      username: string;
      password: string;
      defaultWebsiteId?: string;
    };

const CLOUD_DEFAULT_BASE_URL = "https://api.umami.is/v1";

const stripSlash = (url: string) => url.replace(/\/+$/, "");

export function resolveConfig(
  env: Record<string, string | undefined>,
): UmamiConfig {
  const apiKey = env.UMAMI_API_KEY;
  const username = env.UMAMI_USERNAME;
  const password = env.UMAMI_PASSWORD;
  const baseUrlRaw = env.UMAMI_BASE_URL;
  const defaultWebsiteId = env.UMAMI_DEFAULT_WEBSITE_ID;

  if (apiKey) {
    return {
      mode: "cloud",
      baseUrl: stripSlash(baseUrlRaw ?? CLOUD_DEFAULT_BASE_URL),
      apiKey,
      defaultWebsiteId,
    };
  }

  if (username || password || (baseUrlRaw && !apiKey)) {
    if (!username || !password || !baseUrlRaw) {
      throw new ConfigError(
        "Self-hosted mode requires UMAMI_USERNAME, UMAMI_PASSWORD, and UMAMI_BASE_URL to all be set.",
      );
    }
    return {
      mode: "self-hosted",
      baseUrl: stripSlash(baseUrlRaw),
      username,
      password,
      defaultWebsiteId,
    };
  }

  throw new ConfigError(
    [
      "No Umami credentials found. Set one of:",
      "  Cloud:       UMAMI_API_KEY (optional: UMAMI_BASE_URL)",
      "  Self-hosted: UMAMI_USERNAME + UMAMI_PASSWORD + UMAMI_BASE_URL",
      "Optional for both: UMAMI_DEFAULT_WEBSITE_ID",
    ].join("\n"),
  );
}
