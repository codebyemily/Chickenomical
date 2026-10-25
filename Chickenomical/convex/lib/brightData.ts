import { env } from "../_generated/server";

/** Prefer Bright Data Unlocker; fall back to direct fetch when unlocker is blocked. */
export async function unlockerJson(url: string | URL, { headers, preferDirect = false }: {
  headers?: Record<string, string>;
  preferDirect?: boolean;
} = {}) {
  const order = preferDirect
    ? [() => directJson(url, headers), () => brightDataJson(url, headers)]
    : [() => brightDataJson(url, headers), () => directJson(url, headers)];
  let lastError: unknown;
  for (const attempt of order) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/403|401|404|Forbidden|Unauthorized|robots|bad_endpoint|captcha|Proxy Error|unauthenticated/i.test(message)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch JSON for ${url}`);
}

async function brightDataJson(url: string | URL, headers?: Record<string, string>) {
  const token = env.BRIGHTDATA_API_TOKEN;
  const zone = env.BRIGHTDATA_UNLOCKER_ZONE;
  if (!token || !zone) throw new Error("Bright Data env vars are not configured.");
  const body: Record<string, unknown> = {
    zone,
    url: String(url),
    format: "raw",
    country: "us",
  };
  if (headers) body.headers = headers;
  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Bright Data HTTP ${response.status}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Bright Data did not return JSON for ${url}: ${text.slice(0, 180)}`);
  }
}

async function directJson(url: string | URL, headers: Record<string, string> = {}) {
  const response = await fetch(String(url), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Chickenomical/1.0",
      ...headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${url}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Direct fetch did not return JSON for ${url}: ${text.slice(0, 180)}`);
  }
}
