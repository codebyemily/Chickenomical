# Chickenomical screen map

Chickenomical reads current and recent menu records from Convex. A nearby comparison uses the current board and its saved crawl distances. The Sources screen reads a separate, bounded query of recent stored offers, which can include older crawls and other locations. Offers remain tied to their source, location, and observation time.

## Routes

| Route | Screen | User task |
| --- | --- | --- |
| `/` | Compare | Browse chicken categories, nearby comparable prices, current board coverage, and saved source records. “All comparisons” is represented in the URL as `/?view=all`, so refresh and browser history keep the view. |
| `/category/[category]` | Category results | Search, filter, and sort current nearby offers for one category. Comparable offers are grouped by matching variant; unrankable rows remain inspectable. |
| `/quantity` | Group order | Set a 1–100 item goal and compare repeatable menu packs at one location. The slider applies immediately; exact entry applies on Return, blur, or the Apply size button. |
| `/location` | Saved distance | Choose a saved radius of 1, 3, 5, or 10 miles. This filters distances already stored with menu records and does not request device location or recalculate a route. |
| `/sources` | Source explorer | Search up to 200 recent stored offers, filter by category, chain, and review status, sort results, and inspect provenance. Results appear 24 at a time. |
| `/source/[id]` | Source record | Review the provider, source URL, menu fields, chain, store, saved distance, and observation data. Links from Sources can resolve through the recent stored-record query. |
| `/offer/[id]` | Offer detail | Inspect price math and the recorded menu offer. A job-scoped URL stays within that scrape; an unscoped URL can resolve from recent stored offers if the current board no longer contains it. |
| `/methodology` | Comparison rules | Read how the app groups comparable offers, calculates unit prices, and handles saved distance, fees, stale data, and incomplete records. |
| `/states` | Recovery guide | Review live database coverage and open explanatory previews for common loading, empty, stale, incomplete, unavailable, and failed-refresh states. |
| `/states/[scenario]` | Recovery preview | Read a specific recovery message alongside current Convex coverage and its next actions. The copy is illustrative; it does not change a scrape job. |
| `+not-found` | Unknown route | Return to Compare or browse source records after opening an unmatched route. |
| Root error boundary | Render recovery | Retry a failed screen or return to Compare, with the same web navigation as other routes. |

## Navigation and state

- iOS and Android use Expo Router native tabs for Compare, Group, Sources, and Method. Location, category, offer, source, and recovery routes remain on the navigation stack.
- Web uses one top navigation across the routed pages. Internal navigation uses Expo Router links that retain real destinations and work with refresh, open-in-new-tab, and browser Back.
- Category, saved radius, and group-size preferences persist on the current device. Exact group-size edits keep the last valid result until the new value is applied.
- Error states describe the unavailable data in plain language and do not show raw backend messages.

## Shared interaction layer

- Expo UI components provide shared buttons, the group slider, category picker, and collapsed comparison details. The category picker, buttons, and slider use the universal components across iOS, Android, and web.
- Native search and quantity fields use Expo UI `TextInput` with platform-specific accessible labels. Web fields use React Native Web `TextInput` so the visible label is also exposed as the input's accessible name.
- Expo Router supplies route links and native tabs. React Native layout and text components provide the shared screen structure and source cards.
- Inputs have visible labels, inline validation, and a minimum 48-point field height. Filter controls expose their selected state and use at least 48-point targets.
- Native tab navigation follows the operating system. Screen content respects safe areas and reserves space for the native tab bar.

## Visual treatment

The existing field-report design remains: DM Sans and Space Mono, compact data labels, bright comparison highlights, flat report panels, and source details next to the prices they explain. Orange text on light surfaces uses a darker ink token for readable contrast. Stale, incomplete, unavailable, and error states use explicit explanatory copy.
