# Top sponsors to use

## Chain providers and scraping backends
Treat each restaurant chain as its own `ChainProvider`, keyed by the existing master `chain_id`. A chain provider owns the official domains, location verification, menu navigation, and extraction rules. **Apify and Bright Data are execution backends**, not the chain registry. Keep the master schema as the source of truth and map each backend's raw output through the shared normalizer.

Adding a chain means implementing its extraction logic, registering it against the existing `chain_id`, and adding known locations/menu URLs through existing master data/configuration. For Apify, add the provider module and deploy the shared Actor. For Bright Data, create/publish a collector for the chain's target domain and register its collector ID. To remove a chain from new scrapes, disable its existing route or registry entry; preserve its master record and historical offers. A new chain needs real extraction code and a deployment, but does not need a new application schema.

Start with one known location per chain and verify the location, item text, piece count, pickup price, source URL, and timestamp against the page. During the proof of concept, compare Apify and Bright Data on the same chain/location. In production, route each chain to the backend that passes the quality and reliability checks; invoke the other as a fallback only after a failed/invalid run. Do not merge two providers' duplicate results as if they were separate offers. Keep backend source and run IDs in the master provenance fields so each observation remains traceable.

## Apify
**Preferred first backend to prove out.** Build one custom Apify Actor that dispatches to a separate chain provider module for each supported chain.

Implementation guide: [Apify end-to-end setup](docs/apify.md).

**Pros:** We control the extraction logic and output schema; Actors accept structured inputs, save results to datasets, and can be run through the API or on a schedule. One Actor can dispatch to chain-specific code while keeping a reusable product interface. [Apify Actors docs](https://docs.apify.com/actors)

**Cons:** We own the chain-specific code and maintenance. Menu layout, location selection, and ordering flows can differ and break independently when a site changes.

**How to use it:** create one `restaurant-menu-collector` Actor in our repo. Give it existing master `chain_id` and `location_id` values plus the known official menu URL and ordering channel; dispatch to the registered chain provider; write raw rows to its default dataset. Have the server-side ingestion worker run the Actor through Apify's API and import/normalize the dataset through the existing master-schema path. Use MCP to explore/test Actors if helpful, but don't make Store search part of the app's production scrape path. The Uber Eats Actor discussed in the team notes targets the wrong source; our Actor should navigate the chain's official menu/order page. [Apify MCP docs](https://docs.apify.com/mcp) · [Build Actors docs](https://docs.apify.com/actors/development)

## Bright Data
**Second backend to prove out.** Build a custom Scraper Studio collector for a chain when Bright Data's hosted browser/proxy/unblocking runtime improves success or reduces work. Bright Data recommends one scraper per target domain; route each registered chain provider to the matching collector ID. [Scraper Studio FAQ](https://docs.brightdata.com/products/scraper-studio/faqs)

Implementation guide: [Bright Data end-to-end setup](docs/bright-data.md).

**Pros:** Scraper Studio provides a hosted AI scraper builder and JavaScript IDE, plus Bright Data's proxy/unblocking infrastructure. It supports manual, scheduled, or API-triggered runs and structured outputs. Bright Data owns the execution environment and the collector code can be exported. This is useful for a chain site where direct requests are unreliable or the site needs a full browser. [Scraper Studio FAQ](https://docs.brightdata.com/products/scraper-studio/faqs)

**Cons:** Every target domain still needs its own extraction logic and maintenance. We also need a Bright Data API trigger/result-download adapter and collector-ID registry in our ingestion worker. Current docs describe an account-level 5,000-credit monthly free tier shared across Bright Data products, with Scraper Studio using one credit per page load; check the actual account balance and payment setup before estimating cost. The team's note says the extra verification step they encountered was not required to access the credits they tried to use. [Scraper Studio FAQ](https://docs.brightdata.com/products/scraper-studio/faqs) · [Scraper Studio API quickstart](https://docs.brightdata.com/products/scraper-studio/quickstart)

**How to use it:** make one custom Scraper Studio collector per target chain domain/extraction flow, using the same master IDs, location input, and output contract as the Apify Actor. Register its Collector ID against the chain's master `chain_id` plus hostname (and channel when the flow differs). Trigger it through the server-side worker, poll/download the result, validate/normalize it, then write through the same master-schema ingestion path. Use it as the primary backend for chains where it is stronger, or as a fallback after an Apify scrape fails validation.

## Visa
Sell it for "best use of reimagining shopping":  creative solution, intuitive/useful/seamless UX.
## Microsoft
"Built for the real world": e.g. saved the user 37% on average for a meal
## Convex
SQL store? Backend? (Best Use)
