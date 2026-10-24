# Apify marketplace collection

This package collects a **known DoorDash or Uber Eats store page** through a configured Apify Actor, then normalizes its output into Chickenomical's shared offer contract. It does not search a marketplace and guess which restaurant matches a canonical location.

## Configuration

Keep these secrets in the shell or deployment secret manager; never commit them:

```text
APIFY_TOKEN=...
APIFY_DOORDASH_ACTOR_ID=owner/actor-name
APIFY_UBEREATS_ACTOR_ID=owner/actor-name
```

Actor dataset shapes differ, so the adapter accepts common item-name, price, section, ID, and URL field names. Before production use, run each selected Actor against one fixed store and preserve its input/output fixture in a non-secret test file.

## Request shape

```json
{
  "platform": "doordash",
  "chain_id": "wendys",
  "location_id": "wendys:30",
  "store_name": "Wendy's Lemmon Ave",
  "address": "4018 Lemmon Ave, Dallas, TX 75219",
  "store_url": "https://www.doordash.com/store/...",
  "ordering_channel": "doordash_pickup",
  "actor_input": { "startUrls": [{ "url": "https://www.doordash.com/store/..." }] }
}
```

`ordering_channel` must match the platform: `doordash_pickup` / `doordash_delivery` or `ubereats_pickup` / `ubereats_delivery`. Price comparison is list-price only. Fees, taxes, subscriptions, and account-specific promotions must remain separate evidence.

## Run and compare

```bash
npm run scrape -- --input request.json
npm run scrape -- --input request.json --push-convex   # also upsert into Convex
npm run compare -- ../brightdata/out/offers/location.json out/offers/doordash-wendys-30.json
```

The comparison only emits rows with matching canonical `product_key`; unmatched marketplace names need review rather than fuzzy price matching.

## Push to Convex

`--push-convex` POSTs the normalized offers to the Convex ingestion route for
the backend (`/ingest/apify` here, `/ingest/brightdata` for direct). Both routes
share the `offerValidator` shape and upsert by `offer_key`, which is suffixed
with the ordering channel so a DoorDash/Uber Eats row and the direct first-party
row for the same item coexist instead of overwriting each other. Configure:

```text
CONVEX_INGEST_URL=http://127.0.0.1:3211      # Convex site origin; provider path is appended
CONVEX_INGEST_SECRET=...                       # must equal Convex env INGEST_SHARED_SECRET
```

For an end-to-end direct-vs-marketplace run that scrapes one store on both
backends and pushes both into Convex, use `scripts/run-local-marketplace-pilot.mjs --push-convex`.
