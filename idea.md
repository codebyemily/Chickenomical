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
| 2026-10-23 | Scraping design docs | Added Apify and Bright Data end-to-end guides and documented the `ChainProvider` registry with Apify/Bright Data as execution backends. Vendor API flows checked against current official docs; no application code was changed. | Select the first chain and known location URL, then implement and verify its provider module/collector. |
| 2026-10-23 | Product and marketing stories | Drafted [`markting/user-stories.md`](markting/user-stories.md) with same-size nugget/tender comparisons (e.g. 4pc vs. 4pc), total and per-piece prices, distance sorting, AARRR growth stories, marketing idea hooks, and future delivery-channel comparison. Documentation only; no app feature was implemented or tested. | Confirm launch area/data coverage; substantiate the 89% savings claim before using it; validate platform prices, fees, and deal eligibility before promising checkout savings; define monetization. |
| 2026-10-23 | Marketing plan | Reviewed `markting/` and added [`markting/plan.md`](markting/plan.md) (AARRR GTM: bets, current-state scores, 90-day roadmap, idea status, open decisions). Tightened hooks/notes in `user-stories.md` to point at the plan and hold unverified % savings. Docs only. | Team: approve/adjust plan; confirm launch geo, monetization hypothesis, budget tier, marketing owner. |
| 2026-10-24 | Expo native navigation and compare flow | Replaced the phone's web-style top navigation with Expo Router native tabs (Compare, Group, Sources, Method), used native stack titles for detail/recovery pages, and compacted category/sort selection into segmented controls. Kept the desktop Expo Web rail and moved the group solver out of the first results scan. | Verify the rebuilt flow in Expo Go on iOS and Android; accessibility, Dynamic Type, and dark-mode coverage still need device review. |
| 2026-10-24 | Chicken-pun copy | Packed user-facing prototype copy with chicken puns while keeping synthetic-data disclaimers, recovery actions, and ranking math inspectable. Tab labels stay Compare / Group / Sources / Method. | Keep the heavy chicken-pun voice; preserve clear synthetic-data caveats. |
| 2026-10-24 | Native/web interface redesign | Added the live piece-goal slider with exact entry, iOS/Android haptics, integrated black safe-area notice, tab-bar scroll clearance, rounded panel/button tokens, route rationale updates, and explicit mock-only/no-auth scope. TypeScript, Expo lint, Expo Web export, accessibility and platform-parity audits passed; iPhone 17 Pro screenshots reviewed. | Android visual/haptic review and production menu/database work remain future work; all present records are synthetic. |

## Product

**Chickenomical** answers: **“Where is the closest, cheapest chicken?”**

A location-aware comparison tool for **fast-food chains only**, starting with chicken nuggets and tenders. Users compare nearby restaurant locations using actual menu prices, standardized serving quantities, and **price per piece**. The experience should also answer “What is the cheapest way to get at least 12 nuggets?”

**Hackathon goal:** A polished, working end-to-end demo with real, attributable menu data for a small set of chains and locations. Favor accurate comparisons over broad coverage.

## Core user stories

- As a user, I can share a location or enter an address and set a search radius.
- I can compare same-size offers within a category (for example, a restaurant's 4-piece nuggets with other 4-piece nuggets), see the **total price** and **price per piece**, and sort by **lowest price per piece**, **lowest order total**, or **distance**.
- I can specify a minimum piece count and see the **least expensive purchasable combination** of available sizes at each location.
- I can see the restaurant, address, original menu item, piece count, price, unit price, distance, ordering channel, source, and when the price was checked.
- I can open the restaurant's menu or ordering page to verify a result.
- If data is stale, incomplete, or incomparable, the app says so rather than inventing a price.

Marketing and future product stories are tracked in [`markting/user-stories.md`](markting/user-stories.md). The “up to 89%” savings line needs a reproducible, attributable baseline before publication. Comparing direct restaurant ordering with DoorDash, Uber Eats, and other platforms is a future idea, not MVP behavior; any such comparison must use the same basket and clearly label eligible deals, known checkout costs, and incomplete totals.

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
     ChainProvider registry
     (one provider module per chain,
      keyed by master chain_id)
             |
     +-------+--------+
     |                |
   Apify         Bright Data
   Actor          collectors
     |                |
     +-------+--------+
             |
   Ingestion worker (TypeScript)
   - provider routing / retries / logging
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

*context.dev remains an unverified candidate. Confirm its exact extraction API, supported targets, and availability before assigning it a production role. Do not assume all backends expose equivalent scraping capabilities.*

### Responsibilities

**Chain providers:** Represent each restaurant chain as a separately registered `ChainProvider`, keyed by its existing master `chain_id`. A chain provider owns the official domains, location verification, menu navigation, selectors, and extraction rules. Adding a chain requires implementing its extractor and registering its route; disabling a chain stops new jobs while preserving the master record and history. This is modular code/configuration, not automatic scraper generation.

**Scraping backends:** Apify and Bright Data execute chain-specific extraction. The Apify path uses one custom Actor that dispatches to registered chain provider modules. The Bright Data path uses a published Scraper Studio collector per target domain/extraction flow, with its Collector ID registered to the chain. Keep backend selection behind the ingestion service so a chain can use the stronger backend and the other can serve as a validated fallback. context.dev remains unverified until its capabilities are confirmed.

**Ingestion worker:** A separate TypeScript service schedules or manually triggers collection, resolves the active chain provider and backend, normalizes records into the existing master schema, validates fields, and calls authorized SpacetimeDB reducers to persist data. Keep scraping credentials server-side. Record Apify/Bright Data as the scraping backend in master provenance/job fields; the chain provider is the source-specific extractor, not a new application data model. SpacetimeDB is the source of truth for the application, not a scraping execution engine.

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

In this master model, `menu_offers.source_provider`, `raw_observations.provider`, and `scrape_jobs.provider` identify the execution backend (`apify` or `bright_data`). A code-level `ChainProvider` is the chain-specific extractor registered by master `chain_id`; it does not require a second application data model.

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

## Copy voice (chicken puns)

Prototype UI copy is intentionally fowl. Headings, notices, empty states, buttons, and status labels use chicken idioms; facts still have to stay true.

| Pun | Where it shows up | Literal meaning that must stay true |
|---|---|---|
| Pecking order | Compare ranking, sort control, featured offer band | Lowest verified sample price per piece |
| Per peck | Unit-price labels | Price per piece |
| Scratch | Totals, money labels, source ledger | Sample pickup total / fictional provenance |
| As the crow flies | Distance labels | Straight-line sample distance, not driving |
| Coop / roost / flock | Tabs, location, group solver | Search area, restaurant location, group order |
| Hatch | Refresh, quantity solver, loading | Simulated refresh or combination search |
| Flew the coop / empty nest / leftovers / half-hatched | Unavailable, no coverage, stale, incomplete | Real recovery states; next action stays in the sentence |
| That's no yolk / no fowl play / cheap as chicken feed | Disclaimers | Data is synthetic, not a live menu |
| Chick it out | Inspect / detail actions | Open the offer or source record |
| Don't count your chickens | Incomplete data, quantity caps | Missing count or invalid goal cannot be ranked |

Tab labels stay **Compare / Group / Sources / Method** so wayfinding stays scannable. Page titles, notices, empty states, buttons, and status labels carry the puns. Restaurant menu item names are unchanged. Error and permission copy still names the failure and the next useful action after the pun.

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
| Data ingestion | ChainProvider contract/registry, first working chain/location extractor, Apify Actor, optional Bright Data collector, provenance and retry logic |
| Backend | SpacetimeDB module, schema, reducers, subscriptions, seed data, ingestion write path |
| Normalization + algorithms | Deterministic parser, classification, validation, unit-price math, quantity solver, tests |
| Frontend + demo | Location input, search/filter/sort, result cards, source/freshness states, final demo flow |

**Integration contract first:** Reuse the existing master-schema types and validation path as the shared ingestion contract; do not create a parallel `NormalizedOffer` model. Keep a checked-in fixture dataset so UI and algorithms can progress before scraping is ready. Fixture data must be labeled as test/demo data.

## Suggested repository structure

```text
chickenomical/
├── README.md
├── plan.md
├── apps/
│   └── web/                 # frontend
├── packages/
│   ├── shared/              # types, schemas, comparison logic
│   └── ingestion/           # chain providers, backend clients, normalization, jobs
│       ├── providers/       # one restaurant-chain module per master chain_id
│       └── backends/        # Apify API and Bright Data API clients
├── spacetime/               # SpacetimeDB module/schema/reducers
├── actors/
│   └── menu-scraper/        # custom Apify Actor dispatching chain providers
├── fixtures/                # explicitly synthetic sample menus
├── tests/
└── docs/
    ├── apify.md
    ├── bright-data.md
    ├── demo.md
    └── sponsor-evidence.md
```

Adjust layout to the selected framework and current SpacetimeDB SDK requirements.

## Build sequence / milestones

### Phase 0 — Prove the riskiest assumptions
- [ ] Confirm one source can return **real location-specific pickup prices** for at least one chain.
- [ ] Confirm legal/technical access conditions, rate limits, and permitted use of each source.
- [ ] Confirm SpacetimeDB TypeScript module, reducer writes, and live client subscription work.
- [ ] Connect ingestion to the existing master-schema contract and select demo geography.

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
| Scrapers get blocked or change | ChainProvider modules, backend routing, retries, fallback, and failure logging; respect site terms and rate limits |
| Menu items are incomparable | Strict categories, standalone-only MVP, explicit piece-count requirements |
| AI invents details | Preserve raw sources; deterministic price extraction; validation and review |
| Data goes stale | Visible timestamps, freshness states, manual refresh, no false accuracy claims |
| SpacetimeDB integration takes longer than expected | Test module/reducer/subscription before building the UI; keep fixture-driven development |
| Too many sponsor integrations | Ship core user flow first; only add tracks with meaningful use and reliable demos |

## Definition of done

Chickenomical is ready when a teammate can start the project from the README, select a location, search for nuggets or tenders, see **real source-attributed prices from multiple nearby fast-food chains**, compare **price per piece**, and calculate the **cheapest purchasable combination for a minimum quantity**. A fresh ingestion run updates the backend and can be demonstrated without hand-editing database records.

**Product principle:** Make it easy to answer “Where is the closest cheapest chicken?” with math users can inspect and prices they can verify.

## Expo prototype status and implementation summary — 2026-10-24

The repository now contains an Expo Router prototype under `expo/`. It is a presentation and interaction demo backed by local fixtures: there is no functional database, live menu or price source, geocoding, GPS lookup, sign-in, account flow, or checkout. All restaurants, store names, addresses, distances, prices, source IDs, and check times are synthetic and the UI labels them that way.

### Screen map and rationale

- `/` is Compare, the primary decision screen. It starts with the search area, category and sort controls, then the strongest sample price and the remaining offers. Offer details are one tap away.
- `/location` provides address entry, a simulated current-location path, sample areas, radius controls, and a permission-denied preview. It explains that no permission prompt, GPS request, or geocoder is connected.
- `/quantity` solves the actual minimum-piece order total by location. Its 1–100 slider updates results while moving, supports keyboard operation on web, and has exact numeric entry as an alternative. It reports extra pieces and never combines different restaurants.
- `/offer/[id]` groups an offer's item, count, total, unit price, distance, status, and channel so the comparison can be inspected.
- `/source/[id]` exposes the fixture provenance fields and explains that no external provider payload is connected.
- `/sources` lists local records and simulates refresh-status states without changing fixture data.
- `/methodology` explains eligibility, per-piece math, distance, quantity solving, and uncertainty. It links to `/states` for review.
- `/states` and `/states/[scenario]` make loading, empty, unavailable, stale, incomplete, denied-location, and refresh-failure recovery copy reviewable.

### Navigation, layout, and interaction

- iOS and Android use Expo Router native tabs for Compare, Group, Sources, and Method. Details and recovery pages use native stack navigation and Back behavior. Expo Web keeps its responsive navigation rail/compact nav.
- On native tab roots, the top safe area and synthetic-data notice share a continuous sign-black field with light status text. Stack routes keep the native black header. Scroll content reserves space below the floating system tab bar so final actions can be reached.
- The group slider uses Expo UI's platform control on iOS/Android and its web range input fallback. The solver updates as the goal changes. iOS uses selection feedback, Android uses a discrete segment tick, and browser builds do not trigger haptics.
- The shape language now uses 12pt compact corners, 18pt standard panels, 24pt featured panels, and pill-shaped actions. Broad yellow fields still identify the leading sample result; black/gray rules retain numeric comparison clarity. Native navigation retains system-owned geometry.
- Chicken puns are deliberate across headings, actions, labels, and recovery screens. Keep that voice while keeping the synthetic-data notice and decision details explicit.
- Expo font loading no longer gates the first render, avoiding a blank content view while custom fonts initialize. Splash colors and Android icon background match the black/yellow palette.

### Serve-sim recovery and evidence

`serve-sim` was capturing the simulator correctly: its helper list and accessibility endpoint were available, and screenshots matched the simulator framebuffer. An Expo Go home/blank state cleared after starting Metro with a cleared cache and reopening the app. Compare and Group were reviewed on the iPhone 17 Pro simulator; the black safe-area header and the Group screen's slider and result panel were visible. No `serve-sim` source code was changed; the blank view came from the Expo bundler/session state.

### Verification results and boundary

- `pnpm exec tsc --noEmit` — passed.
- `pnpm exec expo lint` — passed.
- `pnpm exec expo export --platform web --output-dir /tmp/chickenomical-web-final` — passed; generated 19 web bundles and route output.
- `a11y-audit.mjs --dir=src` — passed, 21 files, zero errors or warnings.
- `platform-parity.mjs --dir=src` — passed, 21 files, zero errors or warnings.
- `git diff --check` — passed.
- iOS Expo Go screenshots on iPhone 17 Pro / iOS 26.5 confirmed the native header, rounded Compare panels, and Group slider/results layout. The accessibility tree exposes the slider label and current value. Android visuals and physical haptic behavior still need device review.
- The fixture prototype does not satisfy the live-data definition of done until verified menu sources and a backend are connected. All current prices and locations remain synthetic, and there is no auth flow.
