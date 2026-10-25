type AssetBinding = {
  fetch(request: Request): Promise<Response>;
};

type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type WorkerEnv = {
  ASSETS: AssetBinding;
  CONVEX_SITE_URL: string;
  CONVEX_INGEST_SHARED_SECRET?: string;
  SCRAPE_RATE_LIMITER: RateLimitBinding;
};

type NearbyScrapeRequest = {
  address: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
};

const SCRAPE_PATH = "/api/scrape/near";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== SCRAPE_PATH) return env.ASSETS.fetch(request);

    const cors = corsHeaders(request);
    if (cors === null) return jsonResponse({ error: "Origin is not allowed." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, cors);
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse({ error: "Expected a JSON request." }, 415, cors);
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 4096) {
      return jsonResponse({ error: "Request body is too large." }, 413, cors);
    }

    const clientKey = request.headers.get("cf-connecting-ip")?.trim() || "local-development";
    const rateLimit = await env.SCRAPE_RATE_LIMITER.limit({ key: clientKey });
    if (!rateLimit.success) {
      return jsonResponse({ error: "Too many nearby searches. Wait a minute and try again." }, 429, cors);
    }

    let body: unknown;
    try {
      const bodyText = await request.text();
      if (bodyText.length > 4096) return jsonResponse({ error: "Request body is too large." }, 413, cors);
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: "Expected a JSON request." }, 400, cors);
    }

    const input = validateScrapeRequest(body);
    if (!input) {
      return jsonResponse({ error: "A valid address, location, and radius are required." }, 400, cors);
    }
    if (!env.CONVEX_INGEST_SHARED_SECRET) {
      return jsonResponse({ error: "Nearby search is not configured on the server." }, 503, cors);
    }

    let endpoint: URL;
    try {
      endpoint = new URL("/scrape/near", env.CONVEX_SITE_URL);
    } catch {
      return jsonResponse({ error: "Nearby search is not configured on the server." }, 503, cors);
    }

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CONVEX_INGEST_SHARED_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          radius_miles: input.radius_miles,
          limit: 3,
        }),
      });
      const responseBody = await upstream.text();
      const headers = new Headers(cors);
      headers.set("Cache-Control", "no-store");
      headers.set("Content-Type", upstream.headers.get("content-type") ?? "text/plain; charset=utf-8");
      return new Response(responseBody, { status: upstream.status, headers });
    } catch {
      return jsonResponse({ error: "Could not start the nearby search. Check your connection and retry." }, 502, cors);
    }
  },
};

function validateScrapeRequest(value: unknown): NearbyScrapeRequest | null {
  if (!isRecord(value)) return null;
  const { address, latitude, longitude, radius_miles: radiusMiles } = value;
  if (typeof address !== "string" || address.trim().length < 2 || address.trim().length > 200) return null;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  if (typeof radiusMiles !== "number" || !Number.isFinite(radiusMiles) || radiusMiles <= 0 || radiusMiles > 50) return null;
  return { address: address.trim(), latitude, longitude, radius_miles: radiusMiles };
}

function corsHeaders(request: Request): Headers | null {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  if (!origin) return headers;

  const sameOrigin = origin === new URL(request.url).origin;
  const localDevelopment = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!sameOrigin && !localDevelopment) return null;
  headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
