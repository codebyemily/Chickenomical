import { env } from "../_generated/server";

type UnlockerOpts = {
  headers?: Record<string, string>;
  preferDirect?: boolean;
  method?: string;
  body?: string;
};

/** Prefer Bright Data Unlocker; fall back to direct fetch when unlocker is blocked. */
export async function unlockerJson(url: string | URL, opts: UnlockerOpts = {}) {
  const text = await unlockerText(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unlocker did not return JSON for ${url}: ${text.slice(0, 180)}`);
  }
}

/** HTML / text through Unlocker with the same direct↔Bright Data fallback. */
export async function unlockerText(url: string | URL, opts: UnlockerOpts = {}) {
  const order = opts.preferDirect
    ? [() => directText(url, opts), () => brightDataText(url, opts)]
    : [() => brightDataText(url, opts), () => directText(url, opts)];
  let lastError: unknown;
  for (const attempt of order) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/403|401|404|Forbidden|Unauthorized|robots|bad_endpoint|captcha|Proxy Error|unauthenticated|timeout/i.test(message)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * POST/GET via Unlocker and return body + Set-Cookie jar (needed for Jollibee basket).
 * Bright Data may surface upstream Set-Cookie on the API response.
 */
export async function unlockerExchange(url: string | URL, opts: UnlockerOpts = {}) {
  const order = opts.preferDirect
    ? [() => directExchange(url, opts), () => brightDataExchange(url, opts)]
    : [() => brightDataExchange(url, opts), () => directExchange(url, opts)];
  let lastError: unknown;
  for (const attempt of order) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/403|401|404|Forbidden|Unauthorized|robots|bad_endpoint|captcha|Proxy Error|unauthenticated|timeout/i.test(message)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error(`Failed to exchange ${url}`);
}

async function brightDataText(url: string | URL, opts: UnlockerOpts) {
  const { text } = await brightDataExchange(url, opts);
  return text;
}

async function brightDataExchange(url: string | URL, opts: UnlockerOpts) {
  const token = env.BRIGHTDATA_API_TOKEN;
  const zone = env.BRIGHTDATA_UNLOCKER_ZONE;
  if (!token || !zone) throw new Error("Bright Data env vars are not configured.");
  const payload: Record<string, unknown> = {
    zone,
    url: String(url),
    format: "raw",
    country: "us",
  };
  if (opts.method && opts.method !== "GET") payload.method = opts.method;
  if (opts.headers) payload.headers = opts.headers;
  if (opts.body != null) payload.body = opts.body;
  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Bright Data HTTP ${response.status}: ${text.slice(0, 180)}`);
  return { text, setCookie: cookieJarFromResponse(response) };
}

async function directText(url: string | URL, opts: UnlockerOpts) {
  const { text } = await directExchange(url, opts);
  return text;
}

async function directExchange(url: string | URL, opts: UnlockerOpts) {
  const response = await fetch(String(url), {
    method: opts.method ?? "GET",
    headers: {
      "User-Agent": "Chickenomical/1.0",
      ...opts.headers,
    },
    body: opts.body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${url}: ${text.slice(0, 180)}`);
  return { text, setCookie: cookieJarFromResponse(response) };
}

function cookieJarFromResponse(response: Response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) {
    return cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
  }
  // Some unlocker responses put cookies in a custom header.
  const raw = response.headers.get("set-cookie")
    ?? response.headers.get("x-brd-cookies")
    ?? response.headers.get("x-luminati-cookies");
  if (!raw) return "";
  return raw.split(/,(?=\s*[^;]+=)/).map((part) => part.split(";")[0].trim()).filter(Boolean).join("; ");
}
