// Shared Convex ingestion client for the scraper CLIs. Each run POSTs normalized
// offers to a provider-specific ingestion route guarded by a shared secret.

// CONVEX_INGEST_URL may be the Convex site origin (e.g. http://127.0.0.1:3211),
// in which case the provider path is appended; a URL that already targets an
// /ingest route is used verbatim.
export function ingestEndpoint(base, provider) {
  const trimmed = base.replace(/\/+$/, "");
  return /\/ingest(\/|$)/.test(trimmed) ? trimmed : `${trimmed}/ingest/${provider}`;
}

/**
 * @param {object} args
 * @param {"brightdata"|"apify"} args.provider route segment under /ingest
 * @param {object} args.query location metadata ({address, latitude, longitude, radius_miles})
 * @param {string} args.observedAt ISO timestamp the batch was collected
 * @param {object[]} args.offers normalized offers sharing the Convex offer shape
 */
export async function pushOffers({ provider, query, observedAt, offers }) {
  const base = process.env.CONVEX_INGEST_URL;
  const secret = process.env.CONVEX_INGEST_SECRET;
  if (!base || !secret) throw new Error("--push-convex requires CONVEX_INGEST_URL and CONVEX_INGEST_SECRET.");
  const endpoint = ingestEndpoint(base, provider);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, observed_at: observedAt, offers }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Convex ingestion HTTP ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}
