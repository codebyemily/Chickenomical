import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function brightDataText(url, { headers } = {}) {
  const cli = loadBrightDataCli();
  const apiKey = process.env.BRIGHTDATA_API_TOKEN ?? cli?.getApiKey();
  if (!apiKey) throw new Error("Set BRIGHTDATA_API_TOKEN or run brightdata login.");
  const zone = process.env.BRIGHTDATA_UNLOCKER_ZONE ?? cli?.resolveZone();
  if (!zone) throw new Error("Set BRIGHTDATA_UNLOCKER_ZONE (for example, web_unlocker1).");
  const body = { zone, url, format: "raw", country: "us" };
  if (headers) body.headers = headers;
  const result = cli
    ? await cli.post(apiKey, "/request", body)
    : await brightDataRequest(apiKey, body);
  if (typeof result === "string") return result;
  if (result && typeof result.body === "string") return result.body;
  return JSON.stringify(result);
}

function loadBrightDataCli() {
  try {
    const { get_api_key } = require("@brightdata/cli/dist/utils/credentials.js");
    const { post } = require("@brightdata/cli/dist/utils/client.js");
    const { resolve } = require("@brightdata/cli/dist/utils/config.js");
    return {
      getApiKey: get_api_key,
      post,
      resolveZone: () => resolve(undefined, "BRIGHTDATA_UNLOCKER_ZONE", "default_zone_unlocker"),
    };
  } catch {
    return null;
  }
}

async function brightDataRequest(apiKey, body) {
  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Bright Data HTTP ${response.status}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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
