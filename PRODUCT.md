# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Expo (React Native), targeting iOS, Android, and web.

## Users

Value shoppers deciding where to get chicken from nearby fast-food restaurants.

## Product Purpose

Chickenomical helps people find a nearby, good-value serving of nuggets or tenders. It compares location-specific menu prices and can calculate the least expensive combination of orders that meets a requested piece count.

## Positioning

Chickenomical compares attributable local menu prices on a like-for-like price-per-piece basis and solves for the cheapest order combination that meets a quantity goal. Prices, sources, and check times remain visible so users can verify results.

## Operating Context

Users share their location or enter an address, choose a search radius and chicken category, and compare nearby pickup offers. They can sort by unit price, total price, or distance, set a minimum piece count, and open the source menu to check an offer.

## Capabilities and Constraints

- The MVP covers a small demo area and 3–5 fast-food chains, starting with nuggets and tenders as separate categories.
- Compare standalone, explicitly counted pickup items using location-specific prices. Show the original menu item, piece count, total price, price per piece, restaurant location, distance, source, ordering channel, and check time.
- The minimum-count result finds the least expensive purchasable combination at each location and shows any extra pieces.
- Exclude fees, taxes, coupons, loyalty pricing, combos, accounts, checkout, and nationwide coverage from the MVP.
- Mark stale, incomplete, unavailable, or incomparable data clearly. Do not invent prices or imply that an unverified price is current.
- The demo geography, menu-data source, ingestion provider, and backend are not yet confirmed. The technical options in `idea.md` are proposals until verified.

## Evidence on Hand

`idea.md` contains the product and implementation brief, but this repository has no application implementation or verified live menu prices yet. Its sample prices are explicitly fabricated examples. Do not present example prices, coverage, savings, or freshness as real without source evidence.

## Product Principles

- Make every comparison inspectable through its source and check time.
- Compare like with like: keep nuggets and tenders separate, and require explicit piece counts and compatible pickup prices.
- Rank by the exact price-per-piece ratio and solve minimum-count orders by the actual purchasable total.
- Be direct when data is stale, missing, or not comparable.

