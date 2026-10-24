---
name: Chickenomical
description: A clear field report for nearby chicken prices.
---

# Design System: Chickenomical

The visual reference is `visualizer/index.html` and `visualizer/styles.css`. The Expo app recreates that presentation through the existing React Native shared components, Expo Router routes, native tabs, and Expo UI controls. Expo Web uses the existing HeroUI field and button variants.

## Visual language

Use a field-report layout: a compact brand mark, a strong sans heading, small mono labels, aligned numeric columns, and clear rules. Lead with one complete yellow price field. Supporting metrics, the offer board, and store coverage use flat white panels over a cool gray ground.

Keep the wording direct: price, piece count, restaurant, distance, source, and check time. Status labels describe the data limit.

## Palette

- Signal yellow: `#FFD400`
- Sign black: `#101010`
- Report ground: `#F1F2F2`
- White panels: `#FFFFFF`
- Muted text: `#687073`
- Panel rules: `#D7D9D9`

Yellow identifies the leading comparison value and directional actions. Stale, incomplete, unavailable, and error states use explicit text with separate neutral, brown, or red treatments.

## Typography

- DM Sans Regular, Medium, and Bold: headings, body copy, menu items, and restaurant names.
- Space Mono Regular and Bold: report labels, counts, prices, distances, and identifiers.
- Prices and counts use tabular figures.
- The leading price is substantially larger than supporting facts.
- Functional labels have an 11pt minimum with at least 16pt line height; freshness and provenance copy use 12pt / 18pt. Editable inputs use at least 16pt on native and web.
- Text remains responsive to native accessibility font scaling.

Fonts are bundled with Expo Font; they do not require a Google Fonts network request.

## Layout and surfaces

- Center the report within a 1360pt content area, with 40pt wide-screen edges and 16pt small-screen edges.
- The masthead ends in a 2pt black rule. The search-origin strip uses a thin gray rule.
- Pair the yellow price field with two white metrics on wide layouts.
- Pair the offer board with the store-coverage panel on wide layouts; stack them on small screens.
- Use aligned table columns when an Expo Web board has sufficient width. Use stacked offer rows on small web layouts and native.
- Content panels are square, opaque, and flat. Separate rows with rules rather than shadows.
- Native tabs, stack navigation, segmented controls, pickers, sliders, and buttons retain their existing component behavior.
- Shared component names and routes remain stable.

## Interaction and data

Search and chain/type filters update the board immediately. Sorting supports unit price, total price, distance, and chain name. The leading signal remains the lowest unit price within the selected area and chicken type.

A table row or stacked offer row opens the existing offer route. Source links, location changes, quantity solving, and recovery routes remain available.

The Expo app uses synthetic local fixtures. Keep the shared sample-data notice visible, identify the snapshot as illustrative, and label stale or incomplete records. Fixture data must never be presented as a verified current restaurant price.
