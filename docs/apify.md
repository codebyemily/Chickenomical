# Apify: Chickenomical menu scraping

This is the implementation guide for running Chickenomical's own chain-specific menu scraper as an Apify Actor. Apify Store Actors and the Apify MCP are useful for discovery and experiments, but the production scraper should be code we own because each chain has its own location and menu flow.

## Production path

```text
Manual refresh / scheduled ingestion worker
    -> Apify REST API: start our Actor
    -> poll the Actor run until it succeeds
    -> read the run's default dataset
    -> validate raw records and normalize offers
    -> write observations/offers through SpacetimeDB reducers
```

The browser calls the ingestion service, never Apify directly. Keep the Apify token on the server. For MVP, let the ingestion worker own the schedule and refresh action; don't also schedule the same Actor in Apify unless we intentionally want a second trigger source.

## Fit and tradeoffs

**Advantages:** We own the Actor and chain modules, can test the code locally, and can keep one versioned Actor that dispatches by master `chain_id`. The API returns a run ID and default dataset, which fits an ingestion job that must record status and provenance.

**Costs:** We own each chain's selectors and location/menu flow. A site redesign or bot protection can make a provider fail, and adding new extraction code requires an Actor build/deploy. Use Apify first for a source the Actor can reach reliably; route difficult domains to Bright Data only when its hosted browser/unblocking improves verified coverage or run stability.

## 1. Create the Actor

Create a TypeScript Actor in a separate directory so its dependencies and Docker build do not get mixed into the web app:

```text
actors/menu-scraper/
  .actor/
    actor.json
    input_schema.json
    dataset_schema.json
  src/
    main.ts
    providers/
      index.ts
      types.ts
      <master-chain-id>.ts
  package.json
  Dockerfile
```

With the Apify CLI installed, run `apify create`, choose **Web scraper**, **TypeScript**, then choose a Crawlee template. Choose Apify as the source-code host so `apify push` builds and deploys this project; use `apify run` for local runs. The generated template supplies the Actor manifest, dependencies, and local storage setup. For a JavaScript-rendered ordering/menu flow use `PlaywrightCrawler`; if the selected chain serves the full menu in static HTML, prefer `CheerioCrawler` to reduce run time and resource use. [Apify CLI quick start](https://docs.apify.com/cli/docs/quick-start) · [Local Actor development](https://docs.apify.com/actors/development/quick-start/locally)

Keep the CLI-generated `.actor/actor.json` and make sure it points to the input schema. For this layout, the relevant manifest fields are:

```json
{
  "actorSpecification": 1,
  "name": "chickenomical-menu-scraper",
  "version": "0.1",
  "input": "./input_schema.json",
  "storages": {
    "dataset": "./dataset_schema.json"
  }
}
```

The dataset schema only controls how output is described in Apify Console; the Actor writes records with `Actor.pushData()` into its default dataset either way.

Keep the Actor private while chain providers are experimental. Treat each restaurant chain as a `ChainProvider` module, keyed by its existing master `chain_id`; Apify is the execution backend. One Actor dispatches to the registered chain provider modules. Each module owns that chain's allowed domains, location verification, menu navigation, selectors, and extraction rules. This avoids turning Apify Marketplace Actors or the Apify MCP search results into our product's provider registry.

Adding a chain means implementing one module, registering it by master `chain_id`, adding a known location/menu URL in the existing master data/configuration, and deploying the Actor with `apify push`. Disabling a chain means disabling/removing its provider registration so new jobs reject it; keep the master chain and historical offers intact. This is an ad hoc code/config change, not a schema migration or automatic scraper generator.

## 2. Use the master schema and define Actor inputs

The existing master schema is the canonical data model. This guide does not define another application-level offer type. The Actor accepts master `chain_id` and `location_id` values plus the source URL/channel needed to collect that location. Pass only location records loaded by the server from the master schema/configuration. Don't accept arbitrary URLs directly from an untrusted browser request. Each chain provider should enforce its expected host/domain before navigation.

Example Actor input:

```json
{
  "locations": [
    {
      "chain_id": "<master-chain-id>",
      "location_id": "<master-location-id>",
      "menu_url": "https://www.example-chain.com/order/store-123",
      "ordering_channel": "first_party_pickup"
    }
  ],
  "categories": ["nuggets", "tenders"]
}
```

The Actor input schema should require `locations`; validate that each has `chain_id`, `location_id`, `menu_url`, and `ordering_channel`. Resolve `chain_id` to a registered chain provider and reject URLs outside that provider's host allowlist. Use `categories` only as an extraction filter; do not have the Actor decide whether an ambiguous item is a nugget or tender.

Minimal `.actor/input_schema.json` shape:

```json
{
  "title": "Chickenomical menu scraper",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "locations": {
      "title": "Locations",
      "description": "Known locations loaded from the master schema/configuration.",
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "chain_id": {
            "title": "Master chain ID",
            "description": "Existing chain identifier from the master schema.",
            "type": "string"
          },
          "location_id": {
            "title": "Master location ID",
            "description": "Existing location identifier from the master schema.",
            "type": "string"
          },
          "menu_url": {
            "title": "Menu URL",
            "description": "Known official menu/order URL for this location.",
            "type": "string"
          },
          "ordering_channel": {
            "title": "Ordering channel",
            "description": "Price basis to collect for this location.",
            "type": "string",
            "enum": ["first_party_pickup", "third_party_pickup"]
          }
        },
        "required": ["chain_id", "location_id", "menu_url", "ordering_channel"]
      }
    },
    "categories": {
      "title": "Categories",
      "description": "Categories to include in the scrape. Classification remains in shared normalization.",
      "type": "array",
      "items": { "type": "string", "enum": ["nuggets", "tenders"] },
      "default": ["nuggets", "tenders"]
    }
  },
  "required": ["locations"]
}
```

Have the Actor preserve source values; the worker maps and normalizes them into the master schema:

| Actor extraction | Master-schema use |
|---|---|
| `chain_id`, `location_id` | Join to the existing `chains` and `locations`; don't create new identities from page text. |
| Exact item label | `menu_offers.original_name` |
| Explicit quantity text such as `10 pc` | Parse to `menu_offers.piece_count`; preserve the source text in the raw observation payload. |
| Displayed pickup price text and currency | Parse to integer `menu_offers.price_cents` plus `currency`; keep the original text in the raw payload. |
| Item category / combo / availability evidence | Shared normalization sets `canonical_category`, `is_combo`, and availability/validation fields. Ambiguous records go to review. |
| Item/menu page URL and collection time | `source_url` and `observed_at`; retain the raw response reference in `raw_observations`. |
| Actor provider and `runId` | `source_provider = "apify"`; link the run ID to the corresponding master `scrape_jobs` / provider-run reference. |
| Pickup vs third-party source | Master `ordering_channel`; do not merge price bases silently. |

The Actor and Bright Data collector use the same raw extraction fields (`original_name`, `source_item_id`, `category_text`, `quantity_text`, `price_text`, `currency`, `combo_evidence`, `availability_text`, and `source_url`). Mapping into the existing master schema happens once in the ingestion adapter. `ExtractedMenuItem` is transport evidence, not a second `NormalizedOffer`/master type. Omit fields the page does not provide; reject a comparable offer if price, explicit quantity, location, or source URL is missing.

## 3. Implement the chain provider

Use one small, explicit provider module per chain. `providers/types.ts` defines the provider boundary and `providers/index.ts` is the allowlist keyed by the existing master `chain_id`. Add a chain by implementing the module and registering its ID. Remove/disable it by disabling the worker route immediately; remove it from the Actor registry and redeploy if the Actor itself must reject manual calls too. Preserve master records and historical offers. Adding new extraction logic requires code and an Actor deployment; this is a modular plugin pattern, not automatic scraper generation.

The following transport types describe only the Actor request and chain-extraction boundary. The ingestion worker builds the request from master records. Keep the Actor input schema as the transport contract and generate or share the matching worker type from it; these types do not replace any master-schema offer type:

```ts
import type { Page } from "playwright";

export type LocationInput = {
  chain_id: string;
  location_id: string;
  menu_url: string;
  ordering_channel: "first_party_pickup" | "third_party_pickup";
};

export type ActorInput = { locations: LocationInput[]; categories?: string[] };

// Raw extraction transport shared with Bright Data's collector output.
// It preserves source evidence and is not a normalized master-schema offer.
export type ExtractedMenuItem = {
  original_name: string;
  source_item_id?: string;
  category_text?: string;
  quantity_text?: string;
  price_text?: string;
  currency?: string;
  combo_evidence?: string | boolean;
  availability_text?: string;
  source_url: string;
  observed_at?: string; // Added by the Actor at collection time.
};

export type ChainProvider = {
  assertAllowedUrl(url: string): void;
  extractOffers(args: {
    page: Page;
    location: LocationInput;
    categories: string[];
  }): Promise<ExtractedMenuItem[]>;
};
```

Implement `providers/index.ts` with imports for only the chains enabled for scraping:

```ts
import type { ChainProvider } from "./types.js";
import { exampleChainProvider } from "./example-chain.js"; // replace with a real provider module

const providersByChainId = new Map<string, ChainProvider>([
  ["<existing-master-chain-id>", exampleChainProvider],
]);

export function getChainProvider(chainId: string) {
  const provider = providersByChainId.get(chainId);
  if (!provider) throw new Error(`No active chain provider registered for ${chainId}`);
  return provider;
}
```

The following is the Actor's dispatch shape; `extractOffers` is implemented separately for each selected chain because selectors and ordering flows depend on its real pages.

`idea.md` does not yet name the first chains or provide verified menu URLs, so the chain module is a real extension point rather than fabricated selectors. Choose one chain and location before implementing its page-specific extraction.

```ts
import { Actor } from "apify";
import { PlaywrightCrawler } from "crawlee";
import { getChainProvider } from "./providers/index.js";
import type { ActorInput, LocationInput } from "./providers/types.js";

await Actor.init();
const input = await Actor.getInput<ActorInput>();
if (!input?.locations?.length) throw new Error("At least one location is required");

// Validate hosts before Crawlee navigates to any input URL.
for (const location of input.locations) {
  getChainProvider(location.chain_id).assertAllowedUrl(location.menu_url);
}

const crawler = new PlaywrightCrawler({
  maxConcurrency: 1,
  maxRequestsPerCrawl: input.locations.length,
  async requestHandler({ page, request, log }) {
    const location = request.userData.location as LocationInput;
    const provider = getChainProvider(location.chain_id);

    // Chain provider handles cookie/location/menu steps and reads pickup prices.
    const rows = await provider.extractOffers({
      page,
      location,
      categories: input.categories ?? ["nuggets", "tenders"],
    });
    if (rows.length === 0) log.warning(`No offers found for ${location.chain_id}/${location.location_id}`);

    const observedAt = new Date().toISOString();
    await Actor.pushData(rows.map((row) => ({
      ...row,
      chain_id: location.chain_id,
      location_id: location.location_id,
      ordering_channel: location.ordering_channel,
      source_provider: "apify",
      observed_at: observedAt,
    })));
  },
});

await crawler.run(input.locations.map((location) => ({
  url: location.menu_url,
  userData: { location },
})));
await Actor.exit();
```

For each chain, the provider must prove that the page is showing the requested location before extracting prices. Prefer a location-specific URL or stable store ID. If it must select a store in the UI, read the resulting location name/address and fail the location run if they don't match the requested store. Keep selectors and route logic in that chain module; keep normalization and database writes outside the Actor.

Do not add delivery fees, taxes, coupons, combos, or checkout-only prices to the MVP offer set. Capture the ordering channel and the exact source URL so the UI can show where and when a price was checked.

## 4. Call the Actor from the TypeScript ingestion worker

Configure these server-only environment variables:

```dotenv
APIFY_TOKEN=...
APIFY_ACTOR_ID=username~chickenomical-menu-scraper
```

Use the Actor Runs API for normal app ingestion. It returns quickly with a run ID and dataset ID; the worker polls the run and downloads records after success. This avoids holding an HTTP request open for the full scrape duration.

```ts
const apifyBase = "https://api.apify.com/v2";

async function apifyJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${process.env.APIFY_TOKEN}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apifyBase}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Apify HTTP ${response.status}: ${JSON.stringify(body)}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return (body?.data ?? body) as T; // Apify API resources may be wrapped in `data`.
}

async function apifyGetWithRetry<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await apifyJson<T>(path);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status && status !== 429 && status < 500) throw error;
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
    }
  }
  throw lastError;
}

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId: string;
};

// This is the Actor transport input from providers/types.ts. Keep it aligned
// with the input schema and project it from existing master-schema records.
type ActorInput = {
  locations: Array<{
    chain_id: string;
    location_id: string;
    menu_url: string;
    ordering_channel: "first_party_pickup" | "third_party_pickup";
  }>;
  categories?: string[];
};

export async function scrapeWithApify(input: ActorInput) {
  const actorId = process.env.APIFY_ACTOR_ID;
  if (!actorId || !process.env.APIFY_TOKEN) throw new Error("Apify is not configured");

  const run = await apifyJson<ApifyRun>(
    `/actors/${encodeURIComponent(actorId)}/runs`,
    { method: "POST", body: JSON.stringify(input) },
  );

  const deadline = Date.now() + 5 * 60_000;
  let status = run.status;
  while (Date.now() < deadline && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const current = await apifyGetWithRetry<ApifyRun>(`/actor-runs/${run.id}`);
    status = current.status;
  }
  if (status !== "SUCCEEDED") {
    const timedOut = Date.now() >= deadline;
    if (timedOut) {
      // Stop a still-running cloud job after the worker's wait window expires.
      await apifyJson(`/actor-runs/${run.id}/abort`, { method: "POST" }).catch(() => undefined);
    }
    const reason = timedOut ? "polling timed out" : `ended with ${status}`;
    throw new Error(`Apify run ${run.id} ${reason}`);
  }

  const items = await apifyGetWithRetry<unknown[]>(
    `/datasets/${run.defaultDatasetId}/items?format=json&clean=true`,
  );
  return { provider: "apify" as const, runId: run.id, items };
}
```

The exact endpoint flow is `POST /v2/actors/{actorId}/runs`, `GET /v2/actor-runs/{runId}`, and `GET /v2/datasets/{datasetId}/items`. Apify documents these endpoints and recommends the `Authorization: Bearer` header. [Run Actor API](https://docs.apify.com/api/v2/actors-runs-post) · [Get Actor run](https://docs.apify.com/api/v2/actor-run-get) · [Dataset items](https://docs.apify.com/api/v2/dataset-items-get) · [Abort Actor run](https://docs.apify.com/api/v2/actors-run-abort-post)

Create the master `scrape_jobs` row before starting. Store the returned Apify run ID immediately in the master schema's existing job/provenance field. After successful completion, validate/normalize every row and write through the authorized SpacetimeDB reducers. Mark the job failed if the Actor fails or times out; never replace a newer verified price with a failed or empty run. If the POST times out after submission and no run ID was received, mark the submission as unknown and reconcile in Apify before starting another run, to avoid duplicate work/charges.

## 5. Develop, deploy, and operate

1. Choose one target chain and one known store/menu URL. Confirm that it yields a pickup price for a standalone nugget or tender size.
2. Implement and register that chain provider, then compare a sample dataset with the visible menu. Check the store, source URL, item name, quantity, price, and channel.
3. Run `apify run` locally with a fixture input. Keep the same input schema locally and in Cloud.
4. Run `apify login`, then `apify push` to deploy. Save the Actor ID in the ingestion service configuration.
5. Trigger it through the worker API, persist the raw observation, then confirm normalized rows reach SpacetimeDB and appear with source/timestamp in the UI.
6. Add another chain provider only after the first source is reliable. Keep one location per run initially; increase concurrency only after the source behaves well.

For a manual Apify-only experiment, the Apify MCP can search the Store, inspect schemas, and run Actors. It does not create the custom chain-specific parsing logic; use the Actor/API above for production. [Apify MCP docs](https://docs.apify.com/mcp)

## Operational failure rules

- Treat `FAILED`, `ABORTED`, and `TIMED-OUT` as failed ingestion jobs; inspect the Apify run log.
- Retry network/5xx and 429 failures on status/result GETs with bounded backoff. Don't blindly replay a run-start POST whose response was lost; first reconcile whether the run started.
- If the worker's polling deadline expires, abort the still-running Apify run and mark the scrape job timed out.
- Keep Actor concurrency low and use a small bounded location batch. Do not crawl all chains/locations on each user search.
- A successful Actor run with zero rows is a parse/source failure for this product until manually reviewed; do not delete the last known good offers.
- Store `runId`, `sourceUrl`, `observedAt`, and raw extracted text with each observation for traceability.
- Never make the Apify token available to browser code.

## Official references

- [Apify TypeScript/JavaScript Actor quick start](https://docs.apify.com/cli/docs/quick-start)
- [Actor input/output and development](https://docs.apify.com/actors/development)
- [Actor API](https://docs.apify.com/api/v2)
- [Apify MCP](https://docs.apify.com/mcp)
