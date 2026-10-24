# Chickenomical user stories

These stories turn the product promise into a small, testable backlog. The main user is a value-conscious diner choosing where to get nuggets or tenders nearby. The growth stories use AARRR tags (Acquisition, Activation, Retention, Referral) to connect product work to marketing.

**GTM plan:** Sequencing, bets, roadmap, and open decisions live in [`plan.md`](./plan.md). Keep this file as the product/growth backlog; do not treat idea hooks below as a full channel plan.

## MVP: compare nearby chicken offers

### US-01 — Choose where to search

**As a hungry diner,** I want to share my location or enter an address and choose a search radius, **so I can compare restaurants I could actually visit.**

- If location permission is declined, I can still enter an address.
- Results show the selected area and straight-line distance; distance is not presented as driving time.
- The app makes clear when the selected area is outside current coverage.

### US-02 — Choose a comparable food category

**As a diner,** I want to choose nuggets or tenders, **so I compare like with like.**

- Nuggets and tenders are separate categories.
- The available categories and restaurant coverage reflect the data actually loaded for my area.

### US-03 — Compare matching serving sizes across restaurants

**As a diner choosing nuggets,** I want to compare each nearby restaurant's 4-piece offer with other 4-piece offers, **so I can see both the total price and price per nugget before choosing where to go.**

- Nuggets and tenders stay in separate comparisons, and offers are grouped by their actual piece count (for example, 4-piece with 4-piece).
- Each offer shows restaurant/location, original menu item, piece count, total price, and unit price (for example, “$0.30 per nugget”), plus ordering channel, source, and check time.
- Offers with different piece counts are not presented as the same-size comparison. A restaurant without a matching size is not shown as though it has one.
- I can sort the matching offers by distance, price per piece, or total price.
- From a result, I can open its source menu or ordering page to choose that offer.

### US-04 — Understand the value ranking

**As a diner,** I want to sort by lowest price per piece, lowest order total, or distance, **so I can choose the kind of value that matters to me.**

- The selected sort is visible.
- Price-per-piece ranking uses the unrounded ratio; rounding is only for display.
- Each result shows both its total price and price per piece, so a low unit price does not hide the cost of the order.

### US-05 — Buy enough pieces for a group

**As someone ordering for more than one person,** I want to enter a minimum piece count, **so I can find the least expensive combination of available sizes at each restaurant.**

- The result shows the chosen item sizes, order total, and any extra pieces.
- Combinations use only available, comparable offers at that location.
- The app does not treat a lowest single-item price as the cheapest way to meet my target.

### US-06 — Check the price and its source

**As a careful shopper,** I want to see where and when each price was checked, **so I can judge whether it is current before I act.**

- I can open the source menu or ordering page for an offer.
- The original menu name, source, and check time are visible with the comparison.
- Stale, incomplete, unavailable, or unverified data is labeled clearly and is not described as a current confirmed price.

### US-07 — Recover when there is not a usable result

**As a diner,** I want a clear explanation when no comparable offers are available, **so I know whether to change my search or try again later.**

- Empty, stale-only, and unsupported-area results have distinct messages.
- Where useful, I can widen the radius, change category, or enter another location.
- The app never fills gaps with made-up prices or savings.

## Growth stories

### US-08 — Understand the promise before starting a search `[Acquisition / Activation]`

**As a first-time visitor,** I want to understand what Chickenomical compares and whether it covers my area, **so I know whether it can help with my next chicken order.**

- The landing or store page explains nearby brand comparison, price-per-piece math, and supported coverage.
- Any example prices are sourced and timestamped, or are unmistakably labeled as examples.
- The main action takes me directly to location and category selection.

### US-09 — Trust a savings claim `[Acquisition / Activation]`

**As a prospective user,** I want a savings claim to show what it is compared against, **so I can tell whether the advertised saving applies to my situation.**

- A claim such as “up to 89% off” is published only after a reproducible comparison supports it.
- The comparison records the location, item/category, baseline, source, and observation date; the wording does not imply that every user saves that amount every day.
- If the evidence is not available or no longer current, use a non-numeric value proposition such as “compare chicken deals in one place.”

### US-10 — Share a useful comparison `[Referral — later]`

**As a diner who found a good-value offer,** I want to share a compact comparison with a friend, **so they can check the same deal without repeating my search from scratch.**

- A shared result includes the restaurant, offer, price basis, source, and check time.
- Opening a shared result shows when its price may be stale and lets the recipient run a fresh search.
- Sharing is optional and does not expose the user's precise location.

### US-11 — Repeat a useful search `[Retention — later]`

**As a returning diner,** I want to rerun a recent location and category search quickly, **so comparing dinner options takes less effort next time.**

- I can start another search from a recent search without re-entering every setting.
- Saved search settings do not make old prices appear current; every result uses its own check time.

## Future idea: compare ordering channels

### US-12 — Compare direct ordering with delivery platforms `[Later]`

**As a diner ready to order,** I want to compare the same meal through the restaurant and supported delivery platforms, **so I can choose the lowest real checkout cost and then place the order there.**

- The comparison uses the same location, items, quantity, and order mode wherever possible.
- It includes available platform deals and item prices, and separately shows fees, taxes, and other known checkout costs; optional tip is called out if it is not included.
- A deal is deducted only when its eligibility is known. Unavailable or account-specific promotions are labeled instead of assumed.
- The app shows the source and last checked time for each channel and makes clear when totals are incomplete.
- I can continue to the selected restaurant or delivery platform to complete checkout; the app does not imply it placed the order itself.

## Marketing idea hooks

Status mirrors [`plan.md`](./plan.md) §12. Run only after the product gate (real attributable prices in the launch area).

- **Acquisition — Easy Keyword Ranking (#1) · Now (post-gate):** Publish one useful page for a specific search such as “4-piece nugget prices near [area].” Only show attributable prices (or honest empty/stale). **Signal:** organic visits that complete a comparison. **Kill if:** traffic without comparisons after a fair trial window.
- **Acquisition — Short Form Video (#42) · Now (post-gate):** One short “4-piece vs. 4-piece” walkthrough from US-03; link straight to search. **Signal:** viewers who complete a comparison. **Resources:** one screen-recorded clip; no paid budget.
- **Referral — Viral Loops (#93) · Q2:** US-10 share link with source + freshness; no rewards until organic share works. **Signal:** shares → fresh searches.

**Do not publish** an “up to 89% off” line until a reproducible baseline exists (US-09). Default public promise: compare same-size nearby offers by price per piece.

## Planning notes

- Treat restaurant names in the brief as examples, not a coverage promise. MVP: small demo area, 3–5 chains.
- Default public promise matches the prototype: price-per-piece comparison you can verify — not a numeric savings guarantee.
- “Stop checking between apps” is supported by compare UX. Delivery/platform checkout compare (US-12) stays later and must not headline acquisition until data quality holds.
- Revenue stays open; rankings must never be sold. See plan §8 for trust-ranked options.
- Confirm with the team (plan §13): launch geography, monetization hypothesis, funding/budget tier, marketing owner, web vs app-first surface.
