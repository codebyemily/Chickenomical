# Chickenomical screen map

This Expo Router prototype uses local fixture data only. Every restaurant, location, address, price, distance, source name, record ID, and check time is fictional. There is no database, menu feed, geocoder, live location lookup, account, sign-in, or checkout.

## Main screens

| Route | Screen | Why a user encounters it |
| --- | --- | --- |
| / | Compare nearby offers | The field-report masthead and search-origin strip lead into the lowest sample unit price, restaurant/offer metrics, searchable offer board, chain/type/sort controls, and store coverage. |
| /location | Choose search area | Users need a way to recover from a denied location request or search without GPS. The prototype accepts a typed label, offers sample areas and radius controls, and clearly says that address lookup and location permission are simulated. |
| /quantity | Meet a piece target | Group orders need the actual purchasable total, not only the cheapest unit ratio. An accessible 1–100 piece slider updates the per-location combinations as it moves; exact numeric entry remains available. The solver shows extra pieces and distance. Invalid quantities get an inline recovery message. |
| /offer/[id] | Offer details | A ranked row needs an inspectable explanation. This screen keeps item, count, total, unit price, distance, status, check time, and source label together. Unknown IDs have a not-found recovery view. |
| /source/[id] | Source record details | Users need provenance attached to a result. The view shows the local record fields and states that its ID is fictional and has no external provider payload. Unknown IDs have a recovery view. |
| /sources | Data-source ledger | Users can review all sample records, their status, and the prototype refresh behavior. The refresh action simulates success locally; the failed-refresh preview retains sample rows. |
| /methodology | Comparison rules | Unit-price and quantity rankings need an understandable method. This page explains category separation, eligibility, exact unit-price math, distance, order combinations, and exclusions. |
| /states | State gallery | Product and design reviewers need a direct index to the screens users encounter when data or permissions fail. |
| /states/[scenario] | Recovery-state preview | A named preview covers loading, no locations, no comparable prices, stale data, incomplete data, unavailable items, denied location access, and source refresh failure. Each state offers its next useful action. |
| +not-found | Unknown-route recovery | A mistyped, stale, or unmatched URL needs an explicit way back to Compare instead of a blank screen or framework default. |
| Root error boundary | Unexpected render failure | A screen-level rendering failure needs a retry action and a clear route back to Compare without exposing developer error details. |

## Navigation and screen decisions

- **Native app navigation:** iOS and Android retain the platform tab bar for Compare, Group, Sources, and Method. Search area, offer detail, source detail, and recovery-state screens push onto the native stack. Gray safe areas and stack headers match the report surface. Scroll content leaves clearance beneath the system tab bar.
- **Web navigation:** Expo Web keeps the existing routes reachable through compact links in the shared masthead. It uses the same React Native components, with the existing HeroUI platform variants for fields and buttons.
- **Progressive disclosure:** the comparison is the first view. Category and sort stay close to results, while the group solver is a dedicated tab instead of a large callout above the primary offers.
- **Native controls:** the phone uses Expo Router native tabs, an Expo UI category segmented control, and universal Expo UI chain/sort pickers. The group slider is keyboard-operable on web and updates the same solver. Existing selection haptics are retained.
- **Recovery-state access:** Method links to the state gallery for review. The individual recovery previews remain stack pages with a visible native Back action.

## Visual treatment

- **Visual reference:** follow `../visualizer/` with a field-report masthead, square opaque panels, black rules, cool gray ground, and a complete yellow price signal. DM Sans carries headings/body copy; Space Mono carries labels and numeric comparisons.
- **Evidence stays attached:** counts, totals, unit prices, distance, source label, ordering channel, and sample check time stay with each offer. Stale, incomplete, and unavailable records have explicit status text.
- **No fake certainty:** a shared sample-data notice labels synthetic content. The report uses an illustrative snapshot status and never calls fixture data verified.
- **Responsive shell:** wide layouts pair the board with store coverage. Wide Expo Web boards use aligned table columns. Small web layouts and native use stacked rows; content stays in a single scroll container. Existing system navigation keeps its platform-owned shape.
- **Shape language:** content-owned panels are square and flat, matching the visualizer. Expo UI and HeroUI controls retain their component behavior and familiar control shapes.
- **Shared controls:** native buttons use Expo UI Host and Button components, and native fields use React Native TextInput. Web-only platform files use HeroUI React buttons and text fields. This keeps Expo Go on native-compatible controls while giving Expo Web HeroUI components. HeroUI Native is not used because its current guidance does not recommend it for web.
- **No account surface:** authentication is out of product scope, so there is no sign-in, registration, profile, or account recovery flow.

## Intended review paths

1. / → change area → compare nuggets or tenders → sort → /offer/[id] → /source/[id]
2. / → set a piece goal → compare per-location combinations → inspect an included menu size
3. /location → preview accepted demo location or permission denied → enter an address manually
4. /states → open each recovery state → follow its suggested action
5. Open an unknown URL → return to Compare; recover from an unexpected render error → retry or return to Compare.

