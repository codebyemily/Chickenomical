import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { get_api_key } = require("@brightdata/cli/dist/utils/credentials.js");
const { post } = require("@brightdata/cli/dist/utils/client.js");
const { resolve } = require("@brightdata/cli/dist/utils/config.js");

export async function brightDataText(url, { headers } = {}) {
  const apiKey = get_api_key();
  if (!apiKey) throw new Error("Bright Data is not logged in. Run brightdata login.");
  const zone = resolve(undefined, "BRIGHTDATA_UNLOCKER_ZONE", "default_zone_unlocker");
  if (!zone) throw new Error("No Bright Data Web Unlocker zone. Run brightdata login.");
  const body = { zone, url, format: "raw", country: "us" };
  if (headers) body.headers = headers;
  const result = await post(apiKey, "/request", body);
  if (typeof result === "string") return result;
  if (result && typeof result.body === "string") return result.body;
  return JSON.stringify(result);
}

export async function brightDataJson(url, options) {
  const text = await brightDataText(url, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Bright Data did not return JSON for ${url}: ${text.slice(0, 180)}`);
  }
}

/** Prefer Bright Data; fall back to direct fetch for APIs the unlocker blocks (403/robots). */
export async function apiJson(url, { headers, preferDirect = false } = {}) {
  const order = preferDirect
    ? [() => directJson(url, headers), () => brightDataJson(url, { headers })]
    : [() => brightDataJson(url, { headers }), () => directJson(url, headers)];
  let lastError;
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

async function directJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Chickenomical/1.0",
      ...headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${url}: ${text.slice(0, 180)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Direct fetch did not return JSON for ${url}: ${text.slice(0, 180)}`);
  }
}
