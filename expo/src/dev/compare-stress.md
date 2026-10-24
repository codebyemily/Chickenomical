# Compare stress review

Open `http://localhost:8081/?stress=1&stressData=worst` while the Expo development server is running. The selector has **Demo data / Worst case / Empty / One / 1,000 rows** positions, persisted in `stressData`. Both `__DEV__` and the explicit `stress=1` flag are required. The ordinary Compare URL has no toolbar.

This is a Compare layout and comparison-data harness. Fixtures enter through `locationsInRadius` and use the real ranking, filters, hero, metrics, coverage, and `OfferRow` renderer. Original `DEMO_LOCATIONS` are never mutated. Every fixture offer/location ID is stable and unique. Detail links deliberately map to valid original demo records; the toolbar says that detail pages show original demo data. Fixture detail pages are therefore outside the scope of this review.

## Field map

The prototype's active contract is `src/data/demo.ts`, not the separate Convex app. No runtime validation or string/numeric/list maximum is defined at this boundary. The sibling Convex schema also uses unrestricted strings/numbers, but is not connected to Expo.

| Rendered field | Source | Type | Limit | Optional? / display |
| --- | --- | --- | --- | --- |
| Offer title in hero, row, exclusions, search | `DemoOffer.itemName` | string | Unbounded | Required |
| Chain in hero, row, coverage, options, search | `DemoLocation.chain` | string | Unbounded | Required |
| Store name in row, coverage, search and accessible label | `DemoLocation.displayName` | string | Unbounded | Required |
| Store address in coverage | `DemoLocation.address` | string | Unbounded | Required |
| Count in hero, compact row, accessible label | `DemoOffer.pieceCount` | number or null | No numeric bounds | Nullable; null excluded from ranking |
| Total price | `DemoOffer.priceCents` → `money` | number or null | No numeric bounds | Nullable; null excluded from ranking |
| Unit price | price / count → `unitMoney` | number or null | No numeric bounds | Missing usable operands display `—` |
| Category in filter, row, metric | `Category` / prototype state | enum | `nuggets`, `tenders` | Required |
| Freshness/status, stale color | `DemoOffer.freshness` → `freshnessText` | enum | Recent, stale, incomplete, unavailable | Required |
| Check-time text in hero/compact row/accessibility | `DemoOffer.mockChecked` | string | Unbounded; preformatted text | Required |
| Source identifier in compact row/accessibility | `DemoOffer.sourceRecordId` | string | Unbounded | Required |
| Distance in row, coverage, accessible label | `distanceMiles[area]` → `toFixed(1)` | number | No numeric bounds; nearby filtered by radius | Required |
| Origin label | prototype `locationLabel` | string | Unbounded at context; entry route controls input | Required |
| Radius | prototype `radiusMiles` | number | Context unbounded; location UI offers discrete radii | Required |
| Restaurant / offer / result counts | Filtered location/offer array lengths | integer | Unbounded | Zero, one, many |
| Store bar / comparable count | Per-store comparable offer count / maximum | number | Derived, zero denominator guarded by `max(1, …)` | Zero supported |
| Hero rank and total | Presence of best offer / array length | string | `01` or `—`; total padded to two digits, no maximum | Zero supported |
| Offer route / React identity | `DemoOffer.id` | string | Unbounded | Required; harness maps navigation only |
| Location identity and join | `DemoLocation.id`, `DemoOffer.locationId` | string | Unbounded | Required |
| Search and selected chain | Local query / derived chain options | string | Unbounded | Empty supported |
| Sort label / behavior | `SortMode` | enum | Unit, total, distance, chain | Required |
| Type button labels | Literal `Nuggets`, `Tenders` | string | Static | Required |
| Channel labels | Literal `Pickup` / `PICKUP` | string | Static | Required |
| Empty / excluded / method / section copy | Compare component literals | string | Static | Conditional by array state |
| Sample notice, masthead, navigation, footer | `AppFrame` / `PageHeading` literals | string | Static | Shared shell |

`sourceName`, `channel`, and `areaLabel` exist on the fixture contract but are not read by Compare; their detail-page presentation is not tested here. Compare renders no avatars or images, so the catalog's media/fallback cases do not apply.

## Fixture coverage

- Worst: long chain/store/address; a one-character chain/store; a plausible unbroken German menu compound; Vietnamese diacritics and CJK; a long composite source ID with UUID; a newline in a menu title; literal markup/entity text; 1 and 1,284 pieces; $699.99 catering price; recent/stale/incomplete/unavailable records; nullable count and nullable price for both categories; just-now, three-year-old, and future check labels.
- Empty: zero stores, offers, and results; no-comparable hero and actionable recovery state.
- One: one store and one comparable offer per category, with one piece; tests singular copy.
- 1,000 rows: 100 distinct fictional stores and 1,000 comparable rows per category; 2,000 underlying offers; unique keys and valid mapped detail links.
- The same source/ranking/filter boundary handles every mode. Dates are already formatted strings in this prototype; this checks their layout, not relative-time calculation.

## What broke — left unfixed

| # | Severity | Field / realistic value | Verified result | Cause and proposed fix |
| --- | --- | --- | --- | --- |
| 1 | **Broken** | Priced-offer count `1000` | At 320 CSS px, the metric displays `100` and then `0` on a separate line. The number's 92px container has 96px height with a 48px line height. | Two side-by-side cards leave too little room. Stack metrics at narrow widths and keep numeric strings unbroken. Fix `src/app/(tabs)/index.tsx:114` and styles at `:293`–`:296`. At 200% text emulation the desktop `$699.99` amount also splits into `$699` / `.99`; keep price strings unbroken and allow columns/layout to yield (`src/components/offer-row.tsx:115`, `:124`). |
| 2 | **Broken under text enlargement** | `Hähnchennuggetsspezialitäten` | At 320 CSS px with 200% text-only emulation, menu and chain strings exceed their row; the actual ScrollView becomes 530px wide. At 1280px with the ~831px table board, enlarged content produces 1388px scroll width. | Flex text children retain intrinsic minimums: measured menu node `min-width:auto`, no max-width. Constrain the text column (`minWidth: 0`, usable flex width / `maxWidth: '100%'`) and provide a web unbroken-word fallback. Preserve room for distance/actions. Fix `src/components/offer-row.tsx:117`, `:121`, `:127`, `:129`, and coverage text at `src/app/(tabs)/index.tsx:336`. This is emulated text enlargement, not a native Dynamic Type result or browser-zoom conformance claim. |
| 3 | **Fragile at scale** | 1,000 rows | Switching from Empty mounted 16,285 DOM elements, 1,001 offer links including the hero, and a 78,894px desktop scroll region. Chromium Long Task entries were 583ms and 103ms. | All offers render in a `.map`, and all coverage rows render together. Establish a result cap/pagination contract or virtualize the list with stable keys. Fix `src/app/(tabs)/index.tsx:188`; also avoid repeating full-list filters for each coverage row. Timing is an Expo development-browser sample, not production/native profiling. |
| 4 | **Ugly** | `pieceCount: 1` | Hero says `J · 1 pieces · $0.99 total`; the row's accessible name also says `1 pieces`. Result count and coverage correctly say `1 result` / `1 comparable offer`. | Use a shared count formatter with singular/plural in `src/app/(tabs)/index.tsx:103` and `src/components/offer-row.tsx:23`. |
| 5 | **Ugly** | Long chain plus `0.1 mi` | At 320px the distance becomes `0.1` / `mi`; the same occurs in the narrow desktop coverage rail. | Distance is allowed to shrink while the name consumes the row. Reserve its intrinsic width (`flexShrink: 0`) and let the name wrap in its remaining width. Fix `src/components/offer-row.tsx:127`–`:128`, `src/app/(tabs)/index.tsx:335`–`:337`. |
| 6 | **Ugly** | `1284` pieces / `1000` offers | Metadata and counts omit grouping even though the menu title says `1,284`. | Centralize locale number formatting for displayed counts; keep full precision for comparisons. Fix `src/app/(tabs)/index.tsx:103`, `:110`, `:117`, `:122`, and `src/components/offer-row.tsx:91`. |

String, quantity, price, distance, and list maxima remain undefined at the Expo data boundary (`src/data/demo.ts:5`–`:26`). This is a contract limitation; the review does not infer that a connected backend currently accepts any particular malformed value.

## Decisions

1. Keep exact grouped counts/prices for comparisons. For narrow metrics, stack cards rather than abbreviating a precise count.
2. Wrap identifying menu and store names; reserve an unbroken slot for numeric distance/price. A clamp needs a full-value disclosure path.
3. If a future API caps the returned set, document that cap. Otherwise virtualize/paginate before connecting unbounded menu results.

## What held up

- Normal-size Demo and Worst remain within the 320px viewport; neither creates horizontal overflow.
- At 1280px the real table board is approximately 831px wide, with a narrow coverage rail. Long titles, store/address text, diacritics, CJK, and $699.99 remain readable there at normal text size.
- At 2560px both datasets retain the 1360px content maximum instead of stretching text across the viewport.
- The long composite source ID wraps in the compact row without clipping. Tall diacritics remain visible. Literal markup renders as text.
- Recent/stale labels stay visible; incomplete and unavailable records remain outside the comparable ranking.
- Empty recovery action navigates to the existing Location route. One-row layout has no orphaned separators, and result/coverage singulars are correct.
- Demo data are restored by the selector; the URL persists each selection. Original fixtures remain unchanged.

## Evidence and limits

Rendered Expo Web checks used a dedicated agent tab. Runtime captures exercised nuggets across all five modes; equivalent tender fixtures were built and typechecked. Native simulator/device hardware was unavailable. No iOS/Android runtime, VoiceOver/TalkBack, release-device frame rate, or native Dynamic Type claim is made. The project intentionally uses a light reference palette and has no RTL product flow; dark and RTL variants were not invented for this review.

200% text-only emulation doubled the **existing computed font sizes and numeric line heights** on actual rendered text/form controls, leaving data and containers unchanged. The run used the live Compare renderer, not copied DOM/data. Browser zoom shortcuts did not change the collaborative browser's scale, so no browser-zoom claim is made. A fresh navigation clears the temporary text overrides. Normal-size Worst has been restored in the left-running tab.

| State / capture | Screenshot path |
| --- | --- |
| Demo 320 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0qd93-d671e0a7.png` |
| Worst 320 rows | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0r91k-c55d6599.png` |
| Demo real 1280 board | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0she9-1e7e9fc7.png` |
| Worst real 1280 board | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0s72l-2f785c6a.png` |
| Demo 2560 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0sc7e-f6a25858.png` |
| Worst 2560 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0sc0v-208043a3.png` |
| One 320 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0wjyx-efa6d9ee.png` |
| Empty 320 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0xi2f-3ec4f890.png` |
| 1,000 metric break 320 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0t99s-e30bffce.png` |
| Worst 200% text 320, compound break | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0uiva-649d77f1.png` |
| Demo 200% text 320 | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0vb0g-0940bb12.png` |
| Worst 200% text real 1280 board | `/Users/sam/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvn0vohp-0fed1a40.png` |

Harness checks: `npx tsc --noEmit` and `npx expo lint` both passed. No test files were added. Newly discovered breaks are documented before fixes, as requested by the break-ui workflow.

Say `fix all` or `fix 1, 3` to apply the chosen changes.
