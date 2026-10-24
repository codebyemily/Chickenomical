# Chickenomical screen map

This Expo Router prototype reads local mock queries backed by records shaped like `docs/menu-data-structure.md`. Chain, location, menu-offer, deal, component, and provenance fields use the shared schema; every restaurant, address, price, distance, source URL, record ID, and timestamp is synthetic. There is no Convex deployment, live menu feed, geocoder, live location lookup, account, sign-in, or checkout.

## Main screens

| Route | Screen | Why a user encounters it |
| --- | --- | --- |
| / | Compare nearby offers | The primary job is comparing the selected menu category across nearby chain locations. A compact matrix places restaurant chains in columns and menu quantities in rows; each cell leads with that chain's best nearby pickup price per unit, with total price underneath. Tapping a price opens its menu offer. Matrices group by the documented schema variant, currency, and pickup channel so unlike offers never share one comparison. |
| /location | Choose search area | Users need a way to recover from a denied location request or search without GPS. The prototype accepts a typed label, offers sample areas and radius controls, and clearly says that address lookup and location permission are simulated. |
| /quantity | Meet a quantity target | Group orders need the actual purchasable total, not only the cheapest unit ratio. An accessible 1–100 category-unit slider updates per-location combinations; exact numeric entry remains available. The solver shows extra units and distance. Invalid quantities get an inline recovery message. |
| /offer/[id] | Offer details | A ranked row needs an inspectable explanation. This screen shows original menu name, category, offer kind, quantity, list price, variants, includes, channel, validation, source provider, and observed time. Unknown IDs have a not-found recovery view. |
| /source/[id] | Source record details | Users need provenance attached to a result. The view shows schema keys, source URL, provider, source item ID, chain, location, and validation fields. Unknown IDs have a recovery view. |
| /sources | Menu Explorer | Users choose a chain and documented category to browse mock offers and deals, including components, channel, conditions, validation, and provenance. Re-running the local queries simulates the read path; the failed-refresh preview retains rows. |
| /methodology | Comparison rules | Unit-price and quantity rankings need an understandable method. This page explains the documented category IDs, offer eligibility, currency and channel matching, bundle components, separate deals, and exact unit-price math. |
| /states | State gallery | Product and design reviewers need a direct index to the screens users encounter when data or permissions fail. |
| /states/[scenario] | Recovery-state preview | A named preview covers loading, no locations, no comparable prices, stale data, incomplete data, unavailable items, denied location access, and source refresh failure. Each state offers its next useful action. |
| +not-found | Unknown-route recovery | A mistyped, stale, or unmatched URL needs an explicit way back to Compare instead of a blank screen or framework default. |
| Root error boundary | Unexpected render failure | A screen-level rendering failure needs a retry action and a clear route back to Compare without exposing developer error details. |

## Navigation and screen decisions

- **Native app navigation:** iOS and Android use the platform tab bar for Compare, Group, Explore, and Method. Search area, offer detail, source detail, and recovery-state screens push onto the native stack so Back returns to the prior task. Tab-root safe area and the synthetic-data notice form one sign-black header; stack routes use the native black header. Scroll content leaves enough clearance beneath the floating system tab bar.
- **Web navigation:** wide Expo Web uses a left rail; narrow web keeps a compact top navigation. The native tab bar is not duplicated on web.
- **Progressive disclosure:** the comparison is the first view. A compact category picker and location control sit above a horizontally scrollable chain-by-quantity matrix. Non-comparable records are collapsed by default; group ordering stays in its own tab.
- **Native controls:** the phone uses Expo Router native tabs, an Expo UI category picker, and a quantity slider. The group slider is keyboard-operable on web and updates the same solver. A changed best combination receives selection haptics on iOS and discrete slider haptics on Android, with no browser vibration.
- **Recovery-state access:** Method links to the state gallery for review. The individual recovery previews remain stack pages with a visible native Back action.

## Visual treatment

- **Compact matrix:** use crisp gray rules, small type, and a restrained yellow highlight for the lowest chain price in a quantity row. The existing synthetic-data notice identifies all prices as fixtures.
- **Evidence stays attached:** quantities, totals, unit prices, distance, source provider, ordering channel, validation status, and observed time stay with each offer. Stale and incomplete records have explicit status text.
- **No fake certainty:** one persistent black prototype-data notice labels synthetic content. No current-menu, savings, or coverage claim is presented as verified.
- **Responsive shell:** web uses a left navigation rail on wide screens and compact pill navigation below it. Native screens use the OS tab bar, a continuous black safe-area/demo header, and a single scrolling content column.
- **Shape language:** compact rows use 12pt corners, standard panels 18pt, featured panels 24pt, and actions use pill shapes. Native system navigation keeps its platform-owned shape.
- **Shared controls:** native buttons use Expo UI Host and Button components, and native fields use React Native TextInput. Web-only platform files use HeroUI React buttons and text fields. This keeps Expo Go on native-compatible controls while giving Expo Web HeroUI components. HeroUI Native is not used because its current guidance does not recommend it for web.
- **No account surface:** authentication is out of product scope, so there is no sign-in, registration, profile, or account recovery flow.

## Intended review paths

1. / → change area → select a menu category → compare the matching variant matrix and offers → /offer/[id] → /source/[id]
2. /sources → pick a chain and category → inspect menu offers and deals → /source/[id]
3. / → set a category-unit goal → compare per-location combinations within matching variants → inspect an included menu size
4. /location → preview accepted demo location or permission denied → enter an address manually
5. /states → open each recovery state → follow its suggested action
6. Open an unknown URL → return to Compare; recover from an unexpected render error → retry or return to Compare.

