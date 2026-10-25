# Hackathon log

- **Project:** Chickenomical
- **Event:** Cal Hacks 13.0
- **What it does:** Compares chicken menu deals from nearby restaurants and ranks options by price for a selected group size.
- **Live app:** https://chickenomical.com
- **Repo:** https://github.com/codebyemily/Chickenomical
- **Frontend:** Expo
- **Convex deployment:** https://focused-chameleon-321.convex.cloud
- **Components:** none
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP actions, scheduled functions, realtime `useQuery`
- **Auth:** WorkOS AuthKit
- **AI models:** none
- **Started:** 2026-10-24T02:40:00Z
- **Last updated:** 2026-10-25T19:00:03Z

## How we use Convex

- **Nearby deal discovery:** HTTP actions create scrape jobs and schedule menu collection; `Chickenomical/convex/http.ts` and `Chickenomical/convex/scrapeNear.ts` back the Expo search flow in `expo/src/app/(tabs)/(compare)/search.tsx`.
- **Offer comparison and group sizing:** The `menuOffers` schema, indexes, and queries provide offers and price rankings; see `Chickenomical/convex/schema.ts`, `Chickenomical/convex/offers.ts`, and `expo/src/app/(tabs)/quantity.tsx`.
- **Fresh menu data:** Scraper actions and ingestion mutations normalize and save menu results; see `Chickenomical/convex/scrapers.ts`, `Chickenomical/convex/http.ts`, and `Chickenomical/convex/ingest.ts`.
- **Live updates:** `useQuery_experimental` in `expo/src/data/live-offers.ts` feeds Search, Category, Quantity, Location, Offer detail, Sources, Source detail, and Methodology. These screens update without refresh; see their route files under `expo/src/app/`, including `expo/src/app/(tabs)/(compare)/search.tsx`, `expo/src/app/(tabs)/(compare)/category/[category].tsx`, and `expo/src/app/offer/[id].tsx`.

## Log

- 2026-10-24 f48a490 — README.md
- 2026-10-24 e6da034 — idea.md
- 2026-10-24 90c8d4f — idea.md
- 2026-10-24 4430111 — sponsors.md
- 2026-10-24 5335cde — DESIGN.md
- 2026-10-24 70d19af — docs/apify.md
- 2026-10-24 a770d66 — markting/plan.md
- 2026-10-24 86fe4ac — expo/src/app/(tabs)/index.tsx
- 2026-10-24 ad02b15 — expo/SCREEN_MAP.md
- 2026-10-24 9c047db — idea.md
- 2026-10-24 128cf7b — expo/src/app/+not-found.tsx
- 2026-10-24 d5b2ae4 — docs/menu-data-structure.md
- 2026-10-24 029a473 — Chickenomical/convex/http.ts
- 2026-10-24 5a00fe1 — Chickenomical/convex/offers.ts
- 2026-10-24 2fe2962 — expo/src/app/(tabs)/index.tsx
- 2026-10-24 ce51cc5 — expo/src/data/menu-schema.ts
- 2026-10-24 d564621 — expo/src/lib/compare.ts
- 2026-10-25 9f71c99 — scrapers/brightdata/src/chains.mjs
- 2026-10-25 48912ab — visualizer/app.js
- 2026-10-25 3c027b8 — expo/src/data/live-offers.ts
- 2026-10-25 872d039 — Chickenomical/convex/scrapeNear.ts
- 2026-10-25 dd3e271 — expo/src/app/(tabs)/(compare)/category/[category].tsx
- 2026-10-25 c4c1884 — expo/assets/images/chickenomical.png
- 2026-10-25 348a7da — Chickenomical/convex/lib/takeout.ts
- 2026-10-25 1fa5b56 — Chickenomical/convex/offers.ts
- 2026-10-25 6a335b9 — expo/src/components/compare-offer-card.tsx
- 2026-10-25 76fe134 — expo/pnpm-workspace.yaml
- 2026-10-25 2a13644 — expo/src/data/convex-client.ts
- 2026-10-25 32eae2d — Chickenomical/convex/scrapeNear.ts
- 2026-10-25 9ec7be1 — expo/src/lib/map-viewport.ts
- 2026-10-25 39a9f38 — Chickenomical/convex/offers.ts
- 2026-10-25 788f399 — Chickenomical/convex/offers.ts
- 2026-10-25 2e359c6 — expo/src/data/live-offers.ts
- 2026-10-25 fb6b66c — expo/src/app/+html.tsx
