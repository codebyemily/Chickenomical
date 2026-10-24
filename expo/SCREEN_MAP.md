# Chickenomical screen map

This Expo Router prototype uses local fixture data only. Every restaurant, location, address, price, distance, source name, record ID, and check time is fictional. There is no database, menu feed, geocoder, live location lookup, account, sign-in, or checkout.

## Main screens

| Route | Screen | Why a user encounters it |
| --- | --- | --- |
| / | Compare nearby offers | The primary job is deciding where to buy nuggets or tenders. This screen puts the search area and quick category/sort controls before the leading sample unit price and nearby alternatives. |
| /location | Choose search area | Users need a way to recover from a denied location request or search without GPS. The prototype accepts a typed label, offers sample areas and radius controls, and clearly says that address lookup and location permission are simulated. |
| /quantity | Meet a piece target | Group orders need the actual purchasable total, not only the cheapest unit ratio. An accessible 1–100 piece slider updates the per-location combinations as it moves; exact numeric entry remains available. The solver shows extra pieces and distance. Invalid quantities get an inline recovery message. |
| /offer/[id] | Offer details | A ranked row needs an inspectable explanation. This screen keeps item, count, total, unit price, distance, status, check time, and source label together. Unknown IDs have a not-found recovery view. |
| /source/[id] | Source record details | Users need provenance attached to a result. The view shows the local record fields and states that its ID is fictional and has no external provider payload. Unknown IDs have a recovery view. |
| /sources | Data-source ledger | Users can review all sample records, their status, and the prototype refresh behavior. The refresh action simulates success locally; the failed-refresh preview retains sample rows. |
| /methodology | Comparison rules | Unit-price and quantity rankings need an understandable method. This page explains category separation, eligibility, exact unit-price math, distance, order combinations, and exclusions. |
| /states | State gallery | Product and design reviewers need a direct index to the screens users encounter when data or permissions fail. |
| /states/[scenario] | Recovery-state preview | A named preview covers loading, no locations, no comparable prices, stale data, incomplete data, unavailable items, denied location access, and source refresh failure. Each state offers its next useful action. |

## Navigation and screen decisions

- **Native app navigation:** iOS and Android use the platform tab bar for Compare, Group, Sources, and Method. Search area, offer detail, source detail, and recovery-state screens push onto the native stack so Back returns to the prior task. Tab-root safe area and the synthetic-data notice form one sign-black header; stack routes use the native black header. Scroll content leaves enough clearance beneath the floating system tab bar.
- **Web navigation:** wide Expo Web uses a left rail; narrow web keeps a compact top navigation. The native tab bar is not duplicated on web.
- **Progressive disclosure:** the comparison is the first view. Category and sort stay close to results, while the group solver is a dedicated tab instead of a large callout above the primary offers.
- **Native controls:** the phone uses Expo Router native tabs and Expo UI segmented controls and slider. Category and sort use native segments; the group slider is keyboard-operable on web and updates the same solver. A changed best combination receives selection haptics on iOS and discrete slider haptics on Android, with no browser vibration.
- **Recovery-state access:** Method links to the state gallery for review. The individual recovery previews remain stack pages with a visible native Back action.

## Visual treatment

- **Decision Bands:** open with the strongest useful signal and its supporting facts. The lowest fixture unit price gets one full yellow, rounded panel labeled as synthetic. Other records use soft-corner white panels and crisp black or gray rules.
- **Evidence stays attached:** counts, totals, unit prices, distance, source label, ordering channel, and sample check time stay with each offer. Stale, incomplete, and unavailable records have explicit status text.
- **No fake certainty:** one persistent black prototype-data notice labels synthetic content. No current-menu, savings, or coverage claim is presented as verified.
- **Responsive shell:** web uses a left navigation rail on wide screens and compact pill navigation below it. Native screens use the OS tab bar, a continuous black safe-area/demo header, and a single scrolling content column.
- **Shape language:** compact rows use 12pt corners, standard panels 18pt, featured panels 24pt, and actions use pill shapes. Native system navigation keeps its platform-owned shape.
- **Shared controls:** buttons use Expo UI universal Host and Button components; form fields use React Native TextInput to keep normal keyboard and input behavior across web and native targets.
- **No account surface:** authentication is out of product scope, so there is no sign-in, registration, profile, or account recovery flow.

## Intended review paths

1. / → change area → compare nuggets or tenders → sort → /offer/[id] → /source/[id]
2. / → set a piece goal → compare per-location combinations → inspect an included menu size
3. /location → preview accepted demo location or permission denied → enter an address manually
4. /states → open each recovery state → follow its suggested action

