import { httpRouter } from 'convex/server';
import { env, httpAction } from './_generated/server';
import { internal } from './_generated/api';

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

export default http;
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function isNullableString(value: unknown): value is string | null { return value === null || typeof value === 'string'; }
function isNullableNumber(value: unknown): value is number | null { return value === null || (typeof value === 'number' && Number.isFinite(value)); }
