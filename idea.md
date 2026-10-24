# Chickenomical — Implementation Plan

## Agent handoff and project log

`idea.md` is the living onboarding document for this repository. **Whenever an agent changes the codebase, it must update this file in the same task/commit** so the next agent can quickly understand the current implementation.

For each meaningful code change, add or revise the relevant section below and include a short entry in **Recent implementation updates** with:

- date, area/files changed, and what now works;
- interfaces, commands, configuration, or data assumptions that changed;
- verification performed and any known limitations or next steps.

Keep entries factual and concise. Remove or correct obsolete plans when implementation supersedes them; do not leave planned work presented as complete. Documentation-only edits that do not affect implementation may be omitted from the log.

### Recent implementation updates

| Date | Area | Update / verification | Follow-up |
|---|---|---|---|
| 2026-10-23 | Repository onboarding | Established the required agent handoff log in `idea.md`. | Add an entry here with every meaningful codebase change. |

## Product

**Chickenomical** answers: **“Where is the closest, cheapest chicken?”**

A location-aware comparison tool for **fast-food chains only**, starting with chicken nuggets and tenders. Users compare nearby restaurant locations using actual menu prices, standardized serving quantities, and **price per piece**. The experience should also answer “What is the cheapest way to get at least 12 nuggets?”

**Hackathon goal:** A polished, working end-to-end demo with real, attributable menu data for a small set of chains and locations. Favor accurate comparisons over broad coverage.

## Core user stories

- As a user, I can share a location or enter an address and set a search radius.
- I can select nuggets or tenders, then see nearby fast-food offerings sorted by **lowest price per piece**, **lowest order total**, or **distance**.
- I can specify a minimum piece count and see the **least expensive purchasable combination** of available sizes at each location.
- I can see the restaurant, address, original menu item, piece count, price, unit price, distance, ordering channel, source, and when the price was checked.
- I can open the restaurant's menu or ordering page to verify a result.
- If data is stale, incomplete, or incomparable, the app says so rather than inventing a price.

## MVP scope

**In scope**
- 3–5 fast-food chains, with a handful of locations near the demo area.
- Nuggets and tenders, each treated as a distinct category.
- Standalone à la carte items with explicit piece counts and location-specific pickup prices.
- Search by coordinates/address, radius filter, nearest locations, unit-price rankings, and minimum-quantity optimization.
- A working ingestion pipeline from at least one scraping provider into SpacetimeDB.
- A responsive web interface, visible source timestamps, and an end-to-end demo.

**Stretch**
- Expand to more chains/locations, wings (bone-in vs boneless separated), sandwiches, price history, multi-provider fallback, and refresh-status updates.
- Show walking/driving distance or time using a routing provider; MVP straight-line distance must be labeled accordingly.
- Voice search, natural-language parsing, or agentic refresh requests only after core comparison works.

**Out of scope for MVP**
- Delivery fees, taxes, loyalty pricing, coupons, combos, account login, checkout, nationwide coverage, and claiming price accuracy without source verification.

## Architecture

```text
Restaurant websites / publicly accessible menus
             |
     +-------+--------+
     |       |        |
 Bright Data Apify  context.dev*
     |       |        |
     +-------+--------+
             |
   Ingestion worker (TypeScript)
   - adapters / retries / logging
   - parsing and normalization
   - validation / deduplication
   - source and freshness metadata
             |
      SpacetimeDB
   - chains / locations
   - canonical menu offers
   - observations / scrape jobs
   - optional price history
             |
     Web frontend (TypeScript)
   - location and category filters
   - rankings and quantity solver
   - source / freshness disclosure
```

*Confirm context.dev's exact extraction API, supported targets, and availability before assigning it a production role. Do not assume all three providers expose equivalent scraping capabilities.*

### Responsibilities

**Scraping providers:** Bright Data and Apify are candidate data-collection adapters. Build a custom **Apify Actor** with documented input/output if feasible. Evaluate context.dev as an additional adapter once its capabilities are confirmed. Start with one provider that returns usable, location-specific menu data. Use fallback providers only where they demonstrably improve coverage or reliability.

**Ingestion worker:** A separate TypeScript service schedules or manually triggers collection, normalizes records, validates fields, and calls authorized SpacetimeDB reducers to persist data. Keep scraping credentials server-side. SpacetimeDB is the source of truth for the application, not a scraping execution engine.

**SpacetimeDB:** Stores locations, offers, observations, and job status. Use subscriptions for updates to currently viewed results and ingestion status. Use reducers for controlled writes. Verify SDK/runtime capabilities early with a minimal proof of concept.

**Frontend:** Reads filtered data via SpacetimeDB client subscriptions or a thin API layer, computes/displays comparable rankings, and handles location permissions gracefully. Keep ranking logic in a shared TypeScript module with tests so frontend and backend can use the same definitions.

## Data model (logical schema)

### `chains`
- `id`, `name`, `website_url`

### `locations`
- `id`, `chain_id`, `name`, `address`, `latitude`, `longitude`, `menu_url`, `active`
- Unique identity should be based on a stable provider/store ID when available; otherwise use a carefully normalized location key.

### `menu_offers`
- `id`, `location_id`, `original_name`, `canonical_category`, `piece_count`, `price_cents`, `currency`
- `is_combo`, `ordering_channel` (`first_party_pickup`, `third_party_pickup`, etc.)
- `source_provider`, `source_url`, `observed_at`, `validation_status`, `normalization_method`
- Optional: `source_item_id`, `confidence`, `raw_observation_id`, `availability`
- Preserve exact original labels. Never silently compare different ordering channels or combo prices.

### `raw_observations`
- `id`, `location_id`, `provider`, `source_url`, `fetched_at`, `raw_payload_ref`, `parse_status`, `error`
- Store raw payloads in bounded form or external object storage if too large; keep references and relevant extracted fields in SpacetimeDB.

### `scrape_jobs`
- `id`, `location_id`, `provider`, `status`, `started_at`, `finished_at`, `item_count`, `error`

### `price_history` (stretch)
- `offer_key`, `price_cents`, `observed_at`, `source_provider`

**Price rules:** Store money in integer cents; calculate unit price as `price_cents / piece_count` (a rational number), rounding **only for display**. All displayed comparisons must use the same currency and compatible price basis.

## Normalization pipeline

1. **Collect:** Fetch menu records for a specific chain location, preserving original names, raw prices, URL, ordering channel, and timestamp.
2. **Extract:** Parse explicit prices and quantities from structured data or menu text. If the menu is ambiguous, mark it for review.
3. **Classify:** Map to a canonical category (`nuggets`, `tenders`; later `bone_in_wings`, `boneless_wings`, `sandwich`). Do not treat tenders and nuggets as interchangeable.
4. **Count:** Extract piece count from names like `8 ct`, `10-piece`, or `6 pc`. Reject/flag items sold only by weight or unspecified portion size.
5. **Filter:** Exclude combos, family meals with mixed contents, unavailable items, and offers with no reliable price/quantity from standard unit-price rankings.
6. **Validate:** Require positive piece count, nonnegative price, valid location, timestamp, and provenance. Flag suspicious outliers and duplicates.
7. **Upsert:** Build stable offer keys from location, original item identity, size, and ordering channel. Persist the latest observation and optionally record price changes.

Start with deterministic regex/rules for quantities and categories. **Optional AI normalization** can classify difficult names, but it must return structured output and cannot invent prices, sizes, or availability. Low-confidence items should be excluded or visibly labeled.

### Example

| Raw item | Category | Pieces | Price | Unit price |
|---|---|---:|---:|---:|
| `8ct Nuggets` | Nuggets | 8 | $5.20 | $0.65 |
| `10 Piece McNuggets` | Nuggets | 10 | $6.00 | $0.60 |
| `3pc Tenders` | Tenders | 3 | $4.50 | $1.50 |

*All prices above are fabricated examples, not live restaurant prices.*

## Comparison logic

### A. Price per piece

`unit_price = price_cents / piece_count`

Sort by the unrounded ratio. Show original serving size and total price next to unit price. Tie-break using total price, then distance.

### B. Lowest order total

Sort individual purchasable offers by `price_cents`. This answers “What is the cheapest single order?” and does **not** guarantee enough pieces for a requested quantity.

### C. Cheapest way to get at least N pieces

For each restaurant location, consider all available sizes within the selected category and ordering channel. Find the minimum-cost combination of orders whose combined piece count is **at least** `N`. Orders may repeat unless a menu explicitly restricts quantity.

Implement an unbounded minimum-cost dynamic programming solver over piece counts. Cap the search at `N + max_piece_count - 1`, which is sufficient for positive piece counts and prices; reconstruct the chosen quantities. Compare locations using the computed minimum order total, then distance. Display any excess pieces.

Example: a 6-piece at $3.49 and a 12-piece at $6.49. For at least 12 pieces, two 6-pieces cost $6.98, so one 12-piece wins at $6.49.

### D. Distance

MVP: Haversine distance from user coordinates to store coordinates, labeled **straight-line distance**. Do not call it driving or walking distance. Filter to radius and sort by distance where requested.

### E. Freshness

Define a configurable threshold (for demo, e.g. 24 hours). Show `Checked X hours ago` and distinguish `fresh`, `stale`, `unverified`, and `unavailable`. Stale records may appear with a warning but must not masquerade as current confirmed prices.

## UI / UX

**Search controls:** Location (permission or manual address), radius, category, minimum quantity (optional), and sort order.

**Results:** Restaurant name and location, distance, normalized category, original item name, size, price, unit price, ordering channel, checked timestamp, and source link. For minimum-quantity mode, show the winning combination and total cost.

**States:** Loading, no restaurants nearby, no comparable menu items, stale-only results, ingestion failure, and location permission denied. Never show fabricated live prices.

**Demo story:** Search for nuggets near the venue → compare 8-, 10-, and 12-piece offers → sort by price per piece → request at least 12 nuggets → show a different winning combination → open source details → trigger an ingestion refresh and watch an updated record appear through a SpacetimeDB subscription.

## Sponsor strategy

Prioritize genuine, demonstrable integrations. **Do not add tools just for a logo.** Verify final track rules, submission limits, and whether a single project may win multiple prizes.

| Track | Credible contribution | Priority |
|---|---|---|
| **SpacetimeDB** | Core application backend, subscriptions, reducers, live price/refresh updates | Essential |
| **Apify / Best Actor** | Custom reusable menu-collection Actor, used in live ingestion | Essential if extraction works |
| **Bright Data** | Meaningful extraction/fallback coverage, with source and quality comparisons | High; criteria TBD |
| **Visa** | Real price comparison and shopping decision experience | High |
| **Anthropic** | Structured classification of ambiguous menu labels with confidence checks | Optional |
| **Factory** | Runtime Droid SDK job triggered to investigate/repair an ingestion failure; visible actions and limited permissions | Stretch |
| **Microsoft** | Production-minded agent with measurable utility and safeguards | Stretch |
| **Notability / Mana** | Authentic development workflow evidence, if the team actually uses them | Optional |

For Apify, document Actor inputs, outputs, execution, and where the app consumes results. For SpacetimeDB, demonstrate live subscriptions and meaningful backend behavior. For Bright Data, wait for published track criteria before promising eligibility.

## Team workstreams

Assign owners based on team size; workstreams can run in parallel after interfaces are agreed.

| Workstream | Deliverables |
|---|---|
| Data ingestion | First working chain/location extractor, adapter interface, Apify Actor, provenance and retry logic |
| Backend | SpacetimeDB module, schema, reducers, subscriptions, seed data, ingestion write path |
| Normalization + algorithms | Deterministic parser, classification, validation, unit-price math, quantity solver, tests |
| Frontend + demo | Location input, search/filter/sort, result cards, source/freshness states, final demo flow |

**Integration contract first:** Agree on a shared `NormalizedOffer` TypeScript shape and one example payload. Keep a checked-in fixture dataset so UI and algorithms can progress before scraping is ready. Fixture data must be labeled as test/demo data.

## Suggested repository structure

```text
chickenomical/
├── README.md
├── plan.md
├── apps/
│   └── web/                 # frontend
├── packages/
│   ├── shared/              # types, schemas, comparison logic
│   └── ingestion/           # adapters, normalization, jobs
├── spacetime/               # SpacetimeDB module/schema/reducers
├── actors/
│   └── menu-scraper/        # custom Apify Actor
├── fixtures/                # explicitly synthetic sample menus
├── tests/
└── docs/
    ├── demo.md
    └── sponsor-evidence.md
```

Adjust layout to the selected framework and current SpacetimeDB SDK requirements.

## Build sequence / milestones

### Phase 0 — Prove the riskiest assumptions
- [ ] Confirm one source can return **real location-specific pickup prices** for at least one chain.
- [ ] Confirm legal/technical access conditions, rate limits, and permitted use of each source.
- [ ] Confirm SpacetimeDB TypeScript module, reducer writes, and live client subscription work.
- [ ] Agree on `NormalizedOffer` contract and select demo geography.

**Gate:** One verified offer can travel from scraper → normalization → SpacetimeDB → frontend.

### Phase 1 — Core product
- [ ] Add chains and locations.
- [ ] Collect and normalize nuggets/tenders for 3–5 chains.
- [ ] Implement category, piece-count and channel validation.
- [ ] Implement price-per-piece and minimum-quantity comparison.
- [ ] Build location search, results, sorting and freshness indicators.
- [ ] Write tests for edge cases and stale/incomplete records.

**Gate:** User can find the cheapest comparable chicken near the demo location using real prices.

### Phase 2 — Sponsor integrations and polish
- [ ] Package/document a reusable Apify Actor.
- [ ] Demonstrate Bright Data's distinct role if used.
- [ ] Add SpacetimeDB live refresh updates.
- [ ] Add optional AI-assisted normalization with deterministic validation.
- [ ] Capture screenshots, logs, sample source records and sponsor-specific evidence.

**Gate:** Every claimed integration has a working demo and documented code path.

### Phase 3 — Submission
- [ ] Recheck prices and verify sources just before demo.
- [ ] Test on mobile and on a clean machine/browser.
- [ ] Prepare a 90-second core product demo and short sponsor-specific explanations.
- [ ] Record a backup demo video and retain a clearly labeled fixture fallback.
- [ ] Document setup, environment variables, architecture, known limitations and exact sponsor usage.
- [ ] Verify final track criteria, deadlines and multi-prize eligibility.

## Test cases

- `8pc / $5.20` yields exactly `$0.65/piece`.
- Two offers with unit prices that round identically are sorted using full precision.
- A 6-piece order may be purchased twice to satisfy a 12-piece request.
- A 12-piece order can beat two 6-piece orders on total price.
- A 10-piece and a 6-piece can be combined to satisfy a 15-piece request.
- `10pc combo` is not compared to a standalone `10pc` offer.
- A tender is never silently ranked as a nugget.
- An item with no explicit piece count is excluded from per-piece results.
- Two locations of the same chain retain separate prices.
- Duplicate scrape observations do not create duplicate visible offers.
- A stale or failed scrape does not overwrite a newer verified observation.
- Missing geolocation falls back to manual address entry.
- A source failure does not crash the comparison UI.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Location-specific prices are inaccessible | Start with one proven chain; narrow geographic coverage; use verified records only |
| Scrapers get blocked or change | Provider adapters, retries, fallback, failure logging; respect site terms and rate limits |
| Menu items are incomparable | Strict categories, standalone-only MVP, explicit piece-count requirements |
| AI invents details | Preserve raw sources; deterministic price extraction; validation and review |
| Data goes stale | Visible timestamps, freshness states, manual refresh, no false accuracy claims |
| SpacetimeDB integration takes longer than expected | Test module/reducer/subscription before building the UI; keep fixture-driven development |
| Too many sponsor integrations | Ship core user flow first; only add tracks with meaningful use and reliable demos |

## Definition of done

Chickenomical is ready when a teammate can start the project from the README, select a location, search for nuggets or tenders, see **real source-attributed prices from multiple nearby fast-food chains**, compare **price per piece**, and calculate the **cheapest purchasable combination for a minimum quantity**. A fresh ingestion run updates the backend and can be demonstrated without hand-editing database records.

**Product principle:** Make it easy to answer “Where is the closest cheapest chicken?” with math users can inspect and prices they can verify.
