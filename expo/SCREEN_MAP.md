# Chickenomical screen map

Chickenomical compares chicken from stored Convex menu checks. The user’s location, or a place they type, is matched to each restaurant’s saved latitude and longitude, and the nearest restaurants inside the chosen distance are compared. The search bar changes the food. Repeating the same location reuses that match. The Sources screen reads a separate, bounded query of recent stored offers.

## Routes

| Route | Screen | User task |
| --- | --- | --- |
| `/` | Landing | Choose wings, tenders, nuggets, or buckets. A food card opens `/search` with that category. |
| `/search` | Compare | Uses the device location immediately and shows the cheapest nearby pickup prices for the chosen food. The bottom methodology link explains the ranking. “See more” opens `/all`. |
| `/all` | All comparisons | The full ranked list for the current food and location. |
| `/category/[category]` | Category results | Search, filter, and sort current nearby offers for one category. Comparable offers are grouped by matching variant; unrankable rows remain inspectable. |
| `/quantity` | Group order | Set a 1–100 item goal and compare repeatable menu packs at one location. The slider applies immediately; exact entry applies on Return, blur, or the Apply size button. |
| `/location` | Distance | Choose a straight-line radius of 1, 3, 5, or 10 miles for the next Compare search. |
| `/sources` | Source explorer | Search up to 200 recent stored offers, filter by category, chain, and review status, sort results, and inspect provenance. Results appear 24 at a time. |
| `/source/[id]` | Source record | Review the provider, source URL, menu fields, chain, store, saved distance, and observation data. Links from Sources can resolve through the recent stored-record query. |
| `/offer/[id]` | Offer detail | Inspect price math and the recorded menu offer. A job-scoped URL stays within that scrape; an unscoped URL can resolve from recent stored offers if the current board no longer contains it. |
| `/methodology` | Comparison rules | Read how the app groups comparable offers, calculates unit prices, and handles saved distance, fees, stale data, and incomplete records. |
| `+not-found` | Unknown route | Return to Compare or browse source records after opening an unmatched route. |
| Root error boundary | Render recovery | Retry a failed screen or return to Compare, with the same web navigation as other routes. |

## Navigation and state

- Native uses Expo Router stack navigation without a persistent tab bar. The Compare flow links to methodology at its bottom; contextual routes still link to their related source and offer screens.
- Web uses one top navigation across the routed pages. Internal navigation uses Expo Router links that retain real destinations and work with refresh, open-in-new-tab, and browser Back.
- Category, saved radius, and group-size preferences persist on the current device. Exact group-size edits keep the last valid result until the new value is applied.
- Error states describe the unavailable data in plain language and do not show raw backend messages.

## Shared interaction layer

- Expo UI components provide shared buttons, the group slider, category picker, and collapsed comparison details. The category picker, buttons, and slider use the universal components across iOS, Android, and web.
- Native search and quantity fields use Expo UI `TextInput` with platform-specific accessible labels. Web fields use React Native Web `TextInput` so the visible label is also exposed as the input's accessible name.
- Expo Router supplies route links and stack navigation. React Native layout and text components provide the shared screen structure and source cards.
- Inputs have visible labels, inline validation, and a minimum 48-point field height. Filter controls expose their selected state and use at least 48-point targets.
- Native stack navigation follows the operating system. Screen content respects safe areas without reserving space for a persistent tab bar.

## Visual treatment

The existing field-report design remains: DM Sans and Space Mono, compact data labels, bright comparison highlights, flat report panels, and source details next to the prices they explain. Orange text on light surfaces uses a darker ink token for readable contrast. Stale, incomplete, unavailable, and error states use explicit explanatory copy.
