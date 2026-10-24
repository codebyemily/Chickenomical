---
version: 1
slug: "nearby-comparison"
primary_target: "nearby-comparison"
related_targets: []
---

# Nearby Comparison

## Scope and mode
The first comparison screen for Chickenomical's Expo app across iOS, Android, and web. Mode: Operate.

## Audience and task
Value shoppers use their current location or enter an address, choose nuggets or tenders, and compare nearby pickup offers by lowest price per piece. They can optionally ask for the least-cost combination that meets a minimum piece count.

## Content, action, and proof
Lead with location and chicken type, then show ranked offers with the menu item, piece count, total, price per piece, restaurant location and distance, source, pickup channel, and checked time attached to each offer. The result proves its value through inspectable, source-verified data. Use clearly labeled synthetic examples until live data is verified. No checkout action.

## Constraints and unresolved decisions
Preserve the MVP limits in PRODUCT.md: a small demo area and 3–5 chains; nuggets and tenders; no fees, taxes, coupons, loyalty pricing, combos, accounts, or checkout. Keep native navigation and platform controls recognizable on each OS, with a responsive web layout. Keep the airport wayfinding identity coherent across screen implementations; no airport-operator marks or brand assets are supplied. The data source, demo geography, exact typography, responsive breakpoints, and implementation tokens remain open.

## Direction contract

**THESIS:** Make local value as legible as a wayfinding decision: show the best verified price per piece, then its evidence. Keep ranking out of a generic stack of restaurant cards.

**OWN-WORLD:** Decision Bands uses airport wayfinding's signal yellow, sign black, cool neutrals, rectangular bands, concise labels, direct rules, and humanist sans type. Avoid warm paper, teal identity ink, route-color accents, and mosaic cards that dilute this grammar. Yellow marks direction and the lowest verified unit price only. Keep controls platform-specific; attach source and checked time to each offer; align comparison numbers.

**STORY:** Start at current location with address entry available, then separate Nuggets from Tenders. Make the lowest verified unit price obvious, with each offer's total and provenance intact. Keep the minimum-count solver secondary. A restrained split-flap cue may mark a changed rank; respect reduced motion.

**FIRST VIEWPORT:** Put Chickenomical and location first, then Nuggets/Tenders and a compact “Nearby offers · sorted by price per piece” heading. Make the top offer's yellow band and black unit price the strongest signal. Keep restaurant, item/count, total, distance, source, pickup channel, and check time together. Show one complete offer before the fold; place the distinct quantity solver below it.

**FORM:** Decision Bands, the international airport sign-system challenger; third presented direction overall and the first competitive challenger. Selected directly by the user. Direction seed key: `bcb0ca8d`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved implementation choices
Exact font family and sizes, final component geometry and spacing, light/dark semantic mapping, responsive breakpoints, location radius defaults, live menu source, and demo geography will be settled against real implementation and verified data.
