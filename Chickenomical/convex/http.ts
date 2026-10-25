import { httpRouter } from 'convex/server';
import { env, httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { SCRAPE_CHAINS } from './lib/takeout';

const http = httpRouter();

// One ingestion route per execution backend. Both share the same validation and
// shared-secret auth; the path fixes the run-level provider so a Bright Data
// batch and an Apify batch land as distinct runs with correct provenance.
function registerIngestRoute(path: string, provider: 'bright_data' | 'apify') {
  http.route({
    path, method: 'POST',
    handler: httpAction(async (ctx, request) => {
      const expectedSecret = env.INGEST_SHARED_SECRET;
      if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) return new Response('Unauthorized', { status: 401 });
      let body: unknown;
      try { body = await request.json(); } catch { return new Response('Expected JSON body', { status: 400 }); }
      if (!isObject(body) || !isObject(body.query) || !Array.isArray(body.offers) || body.offers.length > 500) return new Response('Invalid ingestion payload', { status: 400 });
      const query = body.query;
      if (!isNullableString(query.address) || !isNullableNumber(query.latitude) || !isNullableNumber(query.longitude) || !isNullableNumber(query.radius_miles) || !isString(body.observed_at)) return new Response('Invalid ingestion metadata', { status: 400 });
      try {
        const result = await ctx.runMutation(internal.ingest.upsertScrapeRun, {
          provider, requested_at: body.observed_at, completed_at: new Date().toISOString(), address: query.address,
          latitude: query.latitude, longitude: query.longitude, radius_miles: query.radius_miles, offers: body.offers,
        });
        return Response.json(result, { status: 201 });
      } catch (error) {
        console.error(`${provider} ingestion rejected`, error);
        return new Response(`${provider} ingestion rejected`, { status: 400 });
      }
    }),
  });
}

registerIngestRoute('/ingest/brightdata', 'bright_data');
registerIngestRoute('/ingest/apify', 'apify');

/**
 * Start an async near-location scrape for the visualizer E2E harness.
 * Returns immediately with a job id; poll scrapeNear:jobById / offers:board.
 * Browser callers (localhost visualizer) need OPTIONS + CORS on every response.
 */
http.route({
  path: '/scrape/near',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => corsPreflight(request)),
});

http.route({
  path: '/scrape/near',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const cors = corsHeaders(request);
    const expectedSecret = env.INGEST_SHARED_SECRET;
    if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
      return new Response('Unauthorized', { status: 401, headers: cors });
    }
    let body: unknown;
    try { body = await request.json(); } catch { return new Response('Expected JSON body', { status: 400, headers: cors }); }
    if (!isObject(body) || !isString(body.address) || body.address.trim().length < 2) {
      return new Response('address is required', { status: 400, headers: cors });
    }
    const radiusMiles = typeof body.radius_miles === 'number' && body.radius_miles > 0 ? body.radius_miles : 8;
    const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 3) : 1;
    const chains = Array.isArray(body.chains)
      ? body.chains.filter((id): id is string => typeof id === 'string' && (SCRAPE_CHAINS as readonly string[]).includes(id))
      : [...SCRAPE_CHAINS];
    if (chains.length === 0) return new Response('No supported chains requested', { status: 400, headers: cors });

    const requestedAt = new Date().toISOString();
    const jobId = await ctx.runMutation(internal.scrapeNear.startJob, {
      address: body.address.trim(),
      latitude: null,
      longitude: null,
      radius_miles: radiusMiles,
      requested_at: requestedAt,
    });
    await ctx.scheduler.runAfter(0, internal.scrapeNear.run, {
      jobId,
      address: body.address.trim(),
      radiusMiles,
      limit,
      chains,
    });
    return Response.json(
      { jobId, status: 'running', chains, radius_miles: radiusMiles },
      { status: 202, headers: cors },
    );
  }),
});

export default http;

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowOrigin = isAllowedVisualizerOrigin(origin) ? origin : 'http://localhost:8080';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function corsPreflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function isAllowedVisualizerOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function isNullableString(value: unknown): value is string | null { return value === null || typeof value === 'string'; }
function isNullableNumber(value: unknown): value is number | null { return value === null || (typeof value === 'number' && Number.isFinite(value)); }
