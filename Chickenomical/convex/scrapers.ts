import { v } from "convex/values";
import { action, env } from "./_generated/server";

const MAX_BRIGHT_DATA_RESPONSE_CHARS = 500_000;
const ALLOWED_DIRECT_HOSTS = [
  "wendys.com",
  "wingstop.com",
  "popeyes.com",
  "raisingcanes.com",
  "chick-fil-a.com",
  "mcdonalds.com",
];

/**
 * Fetches an allowlisted first-party ordering endpoint through Bright Data Web
 * Unlocker. Parsing/normalization stays in the ingestion layer; this action is
 * deliberately not an arbitrary browser proxy.
 */
export const fetchDirectMenu = action({
  args: { sourceUrl: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    assertOfficialOrderingUrl(args.sourceUrl);
    const token = requireEnv("BRIGHTDATA_API_TOKEN");
    const zone = requireEnv("BRIGHTDATA_UNLOCKER_ZONE");
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zone, url: args.sourceUrl, format: "raw", country: "us" }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Bright Data request failed (${response.status}).`);
    if (body.length > MAX_BRIGHT_DATA_RESPONSE_CHARS) {
      throw new Error("Bright Data response exceeds the safe action return limit; normalize it in an ingestion worker.");
    }
    return { sourceUrl: args.sourceUrl, body };
  },
});

/** Starts a one-store DoorDash menu run. The consumer address controls pricing. */
export const startDoorDashMenuScrape = action({
  args: { address: v.string(), storeUrl: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    assertMarketplaceUrl(args.storeUrl, "doordash.com");
    return await startApifyRun("APIFY_DOORDASH_ACTOR_ID", {
      address: args.address,
      startUrls: [{ url: args.storeUrl }],
      maxResults: 1,
      includeMenu: true,
      fetchReviews: false,
    });
  },
});

/** Starts a one-store Uber Eats menu run from a verified store URL. */
export const startUberEatsMenuScrape = action({
  args: { storeUrl: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    assertMarketplaceUrl(args.storeUrl, "ubereats.com");
    return await startApifyRun("APIFY_UBEREATS_ACTOR_ID", {
      store_urls: [args.storeUrl],
      country_code: "us",
    });
  },
});

/** Poll this action from the UI or a scheduled ingestion workflow after start. */
export const getApifyRun = action({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const token = requireEnv("APIFY_TOKEN");
    const run = await apifyJson(`/actor-runs/${encodeURIComponent(args.runId)}`, token);
    const details = run.data;
    if (details.status !== "SUCCEEDED" || !details.defaultDatasetId) {
      return { runId: args.runId, status: details.status as string, datasetId: details.defaultDatasetId ?? null, items: [] };
    }
    const items = await apifyJson(`/datasets/${encodeURIComponent(details.defaultDatasetId)}/items?limit=100`, token);
    return { runId: args.runId, status: details.status as string, datasetId: details.defaultDatasetId as string, items };
  },
});

async function startApifyRun(actorEnvName: ProviderEnv, input: Record<string, unknown>) {
  const token = requireEnv("APIFY_TOKEN");
  const actorId = requireEnv(actorEnvName).replace("/", "~");
  const started = await apifyJson(`/acts/${encodeURIComponent(actorId)}/runs`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const runId = started.data?.id;
  if (!runId) throw new Error("Apify did not return a run ID.");
  return { runId: runId as string, status: (started.data.status ?? "READY") as string };
}

async function apifyJson(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Apify request failed (${response.status}).`);
  return JSON.parse(text);
}

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  if (!(await ctx.auth.getUserIdentity())) throw new Error("Sign in before refreshing menu data.");
}

function requireEnv(name: ProviderEnv) {
  const value = env[name];
  if (!value) throw new Error(`${name} is not configured in Convex.`);
  return value;
}

type ProviderEnv =
  | "BRIGHTDATA_API_TOKEN"
  | "BRIGHTDATA_UNLOCKER_ZONE"
  | "APIFY_TOKEN"
  | "APIFY_DOORDASH_ACTOR_ID"
  | "APIFY_UBEREATS_ACTOR_ID";

function assertOfficialOrderingUrl(rawUrl: string) {
  const hostname = hostnameFor(rawUrl);
  if (!ALLOWED_DIRECT_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new Error("Only approved first-party ordering hosts can be fetched through Bright Data.");
  }
}

function assertMarketplaceUrl(rawUrl: string, host: string) {
  const hostname = hostnameFor(rawUrl);
  if (hostname !== host && !hostname.endsWith(`.${host}`)) throw new Error(`Expected a ${host} store URL.`);
}

function hostnameFor(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("A valid HTTPS URL is required.");
  }
  if (parsed.protocol !== "https:") throw new Error("A valid HTTPS URL is required.");
  return parsed.hostname.toLowerCase();
}
