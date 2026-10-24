# Bright Data Scraper Studio: Chickenomical menu scraping

This guide describes using Bright Data **Scraper Studio custom collectors** for chain-specific menu extraction. It does not use Apify Actors or Bright Data's prebuilt Web Scraper API datasets. Scraper Studio itself runs on Bright Data's proxy and unblocking infrastructure.

## Production path

```text
Manual refresh / scheduled ingestion worker
    -> Bright Data DCA: trigger the chain's Scraper Studio collector
    -> poll DCA for the collection result
    -> validate raw records and normalize offers
    -> write observations/offers through SpacetimeDB reducers
```

The UI asks our ingestion service to refresh. It never calls Bright Data directly. Store the Bright Data API token and collector IDs as server-side secrets/configuration. For MVP, let the ingestion worker own refresh scheduling so the app can track the job and show status. The team's existing master schema remains canonical; this guide only defines the collector inputs and how extracted values map into it. A restaurant chain is the `ChainProvider`; Bright Data is the execution backend for that provider.

## Fit and tradeoffs

**Advantages:** Scraper Studio supplies a hosted Code or Browser worker, proxy/unblocking infrastructure, an AI Agent to draft a scraper, and an IDE to review/export its JavaScript. Its collection API lets our worker trigger a published collector and fetch structured results.

**Costs:** We still maintain one extraction flow per target domain, maintain a Bright Data collector-ID route, and pay according to current account usage/page loads after applicable credits. Scraper Studio snapshots are temporary, so the master database—not the vendor snapshot—must remain the source of truth. Use this backend for chains where its hosted browser or unblocking produces better verified results; the provider route can also use it after an Apify run fails validation.

## 1. Create a custom collector for each chain

In Bright Data Control Panel, open **Scraper Studio** and create a custom scraper for the chain's official menu or ordering page. Use the AI Agent to generate a first version from a target URL and extraction description, then review and edit the result in the JavaScript IDE. Save/publish the collector and copy its Collector ID from the collector page/URL (the vendor's Node starter shows IDs beginning with `c_`).

Use one collector per official target domain and extraction flow. The same chain collector can accept multiple known locations on that domain when they share the same extraction logic. If a chain has separate ordering domains or substantially different page flows, create separate collectors and route them from the server. Bright Data recommends a scraper per specific domain. [Scraper Studio FAQ](https://docs.brightdata.com/products/scraper-studio/faqs) · [Bright Data Scraper Studio API quickstart](https://docs.brightdata.com/products/scraper-studio/quickstart)

Choose the worker to match the source: use a **Code worker** for static HTML/HTTP pages; use a **Browser worker** when the menu is JavaScript-rendered or requires clicking, scrolling, or selecting a store. A Browser worker costs more page loads when its navigation flow visits more pages, so keep it to the providers that need it. [Scraper Studio worker types](https://docs.brightdata.com/products/scraper-studio/worker-types)

Maintain a server-side registry from the existing master `chain_id`, official target hostname, and ordering channel (when it changes the extraction flow) to its collector ID. To add a chain provider, build and publish the collector, add the registry/config entry, and add the location to existing master data. To disable it, remove/disable the route so new jobs fail closed; retain the master chain and historical offers. A different extraction flow still requires collector code and publishing, but no master-schema migration. If a chain uses multiple official domains or menu flows, publish and register a collector for each route, then batch inputs by chain, hostname, and channel before triggering a run.

`idea.md` does not yet name the first chains or provide verified menu URLs, so the prompt below is a setup template; confirm the first domain and location before generating selectors.

For the AI Agent, start with a prompt like this, replacing the placeholder with a real official menu/order URL:

```text
Build a collector for this chain's official restaurant menu/order page:
<KNOWN LOCATION MENU URL>

The input will contain url, chain_id, location_id, and ordering_channel.
Open exactly the supplied location URL and verify that
the page is for the supplied location. Do not search Uber Eats or another
third-party aggregator. Extract standalone nuggets and tenders available for
pickup. Return one row per size with the exact displayed item name, source item
ID if present, visible category text, displayed quantity text, displayed pickup
price text, currency, combo/standalone evidence, availability text if visible,
ordering channel, and item/menu source URL. Preserve raw text. Do not infer a
missing quantity or price. Exclude combos, delivery fees, taxes, and coupons.
Echo the input chain_id, location_id, and ordering_channel in every row. Use
original_name, source_item_id, category_text, quantity_text, price_text,
currency, combo_evidence, availability_text, source_url, and observed_at as
output keys. Omit fields the page does not provide; do not invent them. Include
observed_at as an ISO 8601 UTC timestamp captured during extraction.
Return an empty/failed result if the requested location cannot be verified.
```

Review the generated input/output schema and code before publishing. AI-generated selectors are only a starting point: confirm one real location and several visible prices in the IDE before connecting the app.

## 2. Map collector records into the master schema

Define these required fields in the collector's Inputs schema and use the same names in the API body:

| Input | Type / rule | Purpose |
|---|---|---|
| `url` | Required URL/string | Known official menu/order URL for this location. |
| `chain_id` | Required string | Existing master chain identity. |
| `location_id` | Required string | Existing master location identity. |
| `ordering_channel` | Required enum, initially `first_party_pickup` | Price basis the collector must capture. |

The input array example is:

```json
[
  {
    "url": "https://www.example-chain.com/order/store-123",
    "chain_id": "<master-chain-id>",
    "location_id": "<master-location-id>",
    "ordering_channel": "first_party_pickup"
  }
]
```

For a batch, send one object per known location. The collector's input schema must accept every field we send; Bright Data can reject runs if a schema was just edited and is not yet compatible. The server should load `chain_id`, `location_id`, and the menu URL from the master schema/configuration, validate the URL against that chain's allowed host, then submit it. Never take an arbitrary URL from an untrusted browser request.

The collector output is extraction data, not a second application schema. Map it once in the shared ingestion normalizer:

| Collector output | Master-schema use |
|---|---|
| `chain_id`, `location_id` | Resolve to existing `chains` and `locations`; never create identity from page text. |
| `original_name` | `menu_offers.original_name` |
| `quantity_text` | Parse to `menu_offers.piece_count`; preserve raw text in the raw observation payload. |
| `price_text`, `currency` | Parse to `menu_offers.price_cents` and `currency`; preserve raw text. |
| `category_text`, `combo_evidence`, `availability_text` | Preserve as raw evidence; the shared normalizer sets canonical category, combo/availability, and validation fields. |
| `ordering_channel` | `menu_offers.ordering_channel`; only compare offers on the same basis. |
| `source_item_id`, `source_url`, `observed_at` | Master source/provenance fields and raw observation. |
| Bright Data API collector + collection ID | `source_provider = "bright_data"`; store the collection ID with the master scrape job/provider run metadata. |

The normalizer—not Scraper Studio—decides whether quantity/category/price is valid for comparison. Do not create or overwrite an offer when the collector omits an explicit quantity, pickup price, known location, or source URL. Preserve the response as a bounded raw observation for debugging.

## 3. Configure credentials

Create a Bright Data API token in account settings and keep it on the server. Configure a collector ID per chain:

```dotenv
BRIGHT_DATA_API_TOKEN=...
BRIGHT_DATA_COLLECTOR_ID_EXAMPLE_CHAIN=c_...
```

Use an internal allowlisted map from the master `chain_id` (and, if needed, ordering domain/channel) to `collectorId`; resolve it in the worker and don't let a browser request select an arbitrary collector. The API uses Bearer-token authentication. [Bright Data API authentication](https://docs.brightdata.com/api-reference/authentication)

The team's account note says an extra identity-verification step was not needed to access the credits they tried to use. Bright Data's current Scraper Studio FAQ describes an account-level free tier of 5,000 monthly credits shared across products, with Scraper Studio consuming one credit per page load. The current API quickstart also lists an active account and payment method on file as prerequisites, so confirm the team's actual account status and balance in the control panel before relying on trial usage. [Current Scraper Studio FAQ and billing](https://docs.brightdata.com/products/scraper-studio/faqs) · [API quickstart prerequisites](https://docs.brightdata.com/products/scraper-studio/quickstart)

## 4. Trigger, poll, and download from the ingestion worker

For a published Scraper Studio collector, the Bright Data Scraper Studio API uses:

1. `POST https://api.brightdata.com/dca/trigger?collector=<collector_id>` with an array of inputs; the response includes `collection_id`.
2. Poll `GET https://api.brightdata.com/dca/dataset?id=<collection_id>` until it returns the result array.

The API key goes in `Authorization: Bearer ...`. Omitting `queue_next` queues the work behind in-flight work for that collector; set `queue_next=1` only when the run should start immediately. Polling returns a status object while the snapshot builds and a JSON array when ready. An empty array means the snapshot has no rows or has expired. The current vendor quickstart says time to first record is typically about three minutes for one to ten inputs; actual time depends on the target and page flow. The worker below allows ten minutes for a single-location MVP job. [Bright Data Scraper Studio API quickstart](https://docs.brightdata.com/products/scraper-studio/quickstart)

Example TypeScript worker flow (Node 18+):

```ts
const brightDataBase = "https://api.brightdata.com";

// The worker owns this allowlist. Add a chain by publishing its collector and
// adding the existing master chain_id -> collector ID mapping; remove a route
// to disable future scrapes without deleting chain or offer history.
const collectorIdByRoute: Record<string, string | undefined> = {
  "<existing-master-chain-id>@www.example-chain.com@first_party_pickup": process.env.BRIGHT_DATA_COLLECTOR_ID_EXAMPLE_CHAIN,
};

function getCollectorId(chainId: string, url: string, channel: string) {
  const host = new URL(url).hostname.toLowerCase();
  const collectorId = collectorIdByRoute[`${chainId}@${host}@${channel}`];
  if (!collectorId) throw new Error(`No Bright Data collector registered for ${chainId} on ${host}`);
  return collectorId;
}

async function brightDataJson(url: URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`Bright Data HTTP ${response.status}: ${text}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollBrightDataJson(url: URL) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await brightDataJson(url);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status && status !== 429 && status < 500) throw error;
      lastError = error;
      if (attempt < 2) await sleep(1_000 * 2 ** attempt);
    }
  }
  throw lastError;
}

export async function scrapeWithBrightData(
  chainId: string,
  inputs: Array<{
    url: string;
    chain_id: string;
    location_id: string;
    ordering_channel: "first_party_pickup";
  }>,
) {
  if (!process.env.BRIGHT_DATA_API_TOKEN) throw new Error("Bright Data is not configured");
  if (inputs.length === 0) throw new Error("At least one Bright Data input is required");
  if (inputs.some((input) => input.chain_id !== chainId)) {
    throw new Error("All Bright Data inputs must belong to the selected chain provider");
  }
  const inputRoutes = new Set(inputs.map((input) =>
    `${new URL(input.url).hostname.toLowerCase()}@${input.ordering_channel}`,
  ));
  if (inputRoutes.size !== 1) {
    throw new Error("Batch Bright Data inputs by chain, official hostname, and ordering channel before triggering a collector");
  }
  const collectorId = getCollectorId(chainId, inputs[0].url, inputs[0].ordering_channel);

  const triggerUrl = new URL(`${brightDataBase}/dca/trigger`);
  triggerUrl.searchParams.set("collector", collectorId);
  const accepted = await brightDataJson(triggerUrl, {
    method: "POST",
    body: JSON.stringify(inputs),
  });
  const collectionId = accepted?.collection_id;
  if (!collectionId) throw new Error(`Bright Data returned no collection_id: ${JSON.stringify(accepted)}`);

  const resultUrl = new URL(`${brightDataBase}/dca/dataset`);
  resultUrl.searchParams.set("id", collectionId);
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await sleep(5_000);
    const result = await pollBrightDataJson(resultUrl);

    // Scraper Studio returns a status object while building and an array when ready.
    if (Array.isArray(result)) {
      if (result.length === 0) throw new Error(`Bright Data collection ${collectionId} returned no menu rows`);
      return {
        provider: "bright_data" as const,
        collectionId,
        items: result as unknown[],
      };
    }
    if (["failed", "error"].includes(String(result?.status).toLowerCase())) {
      throw new Error(`Bright Data collection ${collectionId} failed: ${JSON.stringify(result)}`);
    }
  }
  throw new Error(`Timed out waiting for Bright Data collection ${collectionId}`);
}
```

The `/dca` endpoints above are the Scraper Studio collector flow. They are distinct from Bright Data's `/datasets/v3` Web Scraper API, which runs Bright Data's prebuilt dataset scrapers. Chickenomical needs custom Scraper Studio collectors because each restaurant chain's official menu domain needs its own extraction logic.

Before importing the array, validate that every row belongs to one of the requested `chain_id`/`location_id` pairs, has a source URL on the expected chain/ordering host, and contains item/price text. Bright Data may echo request metadata under an `input` object; either configure explicit top-level output fields for the IDs or map the echoed input back to the exact submitted location. Reject any unmatched row. An empty result is a failed scrape for Chickenomical until inspected; do not replace existing offers with zero rows. Save the `collection_id`, raw response, item count, and failure detail on the master `scrape_jobs`/raw observation records.

As with Apify, create the scrape job before making the provider request. If a trigger POST times out after submission but before returning `collection_id`, do not blindly re-trigger: inspect Scraper Studio's collector run history first to avoid duplicate work/charges. Retry GET polling after transient errors with bounded exponential backoff; fail fast on 4xx and fix the token, collector ID, or input schema.

## 5. Build and verify the chain provider's collector

1. Select one chain and one store with a known official pickup menu URL.
2. Generate a collector from that URL, then edit the AI-generated code/schema so it reads the requested store and emits the raw contract exactly.
3. Run it manually in Scraper Studio. Verify the selected store, visible menu prices, piece counts, source URLs, and pickup channel against the page.
4. Save/publish the collector, copy its `c_...` ID, and set the chain's server-side environment mapping.
5. Trigger one input through the worker. Confirm it stores the returned collection ID, normalizes the rows, calls the SpacetimeDB reducers, and exposes source/timestamp in the UI.
6. Add another chain provider by creating its collector, registering its master `chain_id` and collector ID, and adding its location data. Use the same worker and output contract for every collector. Disable one by removing its route; do not delete its master chain or stored history.

If the collector's output schema changes, wait for the change to finish propagating before triggering it. Bright Data documents schema-incompatibility errors when a scraper is started against a mismatched input/output schema. For diagnosis, use the Scraper Studio **Failed crawls / Last errors** view and rerun the failed input there before resuming app ingestion. [Scraper Studio troubleshooting](https://docs.brightdata.com/products/scraper-studio/faqs)

## Operational failure rules

- 4xx means correct the API token, collector ID, account access, or collector input schema; don't retry unchanged requests.
- Retry network/5xx and 429 responses with bounded backoff. Don't replay a trigger POST if acceptance is uncertain; reconcile in the control panel first.
- Treat an empty result as a parse or location-selection failure, not as a valid refresh that deletes old data.
- Keep collector calls server-side, limit each run to selected locations, and record the collection ID and provider on observations.
- Download/ingest results promptly and retain the raw response needed to debug extraction; don't depend on a dashboard snapshot as Chickenomical's data store.
- Use the ingestion worker as the only schedule owner for MVP to keep run state and app refresh behavior in one place.

## Official references

- [Bright Data Scraper Studio FAQ](https://docs.brightdata.com/products/scraper-studio/faqs)
- [Bright Data Scraper Studio API quickstart](https://docs.brightdata.com/products/scraper-studio/quickstart)
- [Initiate collection and delivery](https://docs.brightdata.com/products/scraper-studio/initiate-collection-and-delivery-options)
- [Bright Data Scraper Studio Node.js starter](https://github.com/brightdata/bright-data-scraper-studio-nodejs-project)
- [Bright Data API authentication](https://docs.brightdata.com/api-reference/authentication)
