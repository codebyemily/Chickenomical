#!/usr/bin/env node
// Summarize like-for-like unit-price spreads from a location.json scrape.
// Used for evidence-backed marketing lines (e.g. "Save up to X% on your faves").

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const inputPath = process.argv[2] ?? join(root, "out", "offers", "location.json");
const data = JSON.parse(readFileSync(inputPath, "utf8"));

const offers = data.chains.flatMap((chain) =>
  (chain.stores ?? []).flatMap((store) =>
    (store.offers ?? []).map((offer) => ({
      ...offer,
      chain_name: chain.name,
      chain_id: chain.chain_id ?? offer.chain_id,
    })),
  ),
);

const comparable = offers.filter((offer) =>
  offer.comparable
  && offer.offer_kind === "ala_carte"
  && offer.ordering_channel === "first_party_pickup"
  && Number.isInteger(offer.list_price_cents)
  && Number.isInteger(offer.quantity)
  && offer.quantity > 0
  && offer.category,
);

// Everyday faves: skip party/tailgate packs and giant piece ladders that inflate % savings.
const everyday = comparable.filter((offer) =>
  offer.quantity <= 12
  && !/tailgate|party\s*pack|catering|bucket treat/i.test(offer.original_name),
);

const allStats = bucketStats(comparable);
const everydayStats = bucketStats(everyday).filter((row) => row.cheapest.chain !== row.priciest.chain);

const headline = everydayStats[0] ?? allStats[0] ?? null;
const sandwich = everydayStats.find((row) => row.category === "chicken-sandwich");
const nugget = everydayStats.find((row) => row.category === "chicken-nugget");
const tender = everydayStats.find((row) => row.category === "chicken-tender");

const report = {
  query: data.query,
  observed_at: data.observed_at,
  totals: {
    offers: offers.length,
    comparable_ala_carte: comparable.length,
    everyday_comparable: everyday.length,
    chains_with_offers: new Set(offers.map((o) => o.chain_id)).size,
    comparable_buckets: everydayStats.length,
  },
  headline: headline && {
    claim: `Save up to ${Math.floor(headline.save_pct)}% on your faves everyday`,
    save_pct: headline.save_pct,
    category: headline.category,
    cheapest: headline.cheapest,
    priciest: headline.priciest,
    method: "max unit-price gap within the same category+prep+heat among everyday ala_carte first-party pickup offers (qty ≤ 12, no party/tailgate packs), across different chains in this scrape",
  },
  by_category: {
    sandwich: sandwich ?? null,
    nugget: nugget ?? null,
    tender: tender ?? null,
  },
  top_spreads: everydayStats.slice(0, 8),
};

const outDir = join(root, "out", "stats");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "savings.json");
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify({
  wrote: outPath,
  totals: report.totals,
  headline: report.headline,
  top: report.top_spreads.map((row) => ({
    bucket: row.bucket,
    save_pct: row.save_pct,
    cheap: `${row.cheapest.chain} ${row.cheapest.name} @ ${money(row.cheapest.unit_cents)}/pc`,
    dear: `${row.priciest.chain} ${row.priciest.name} @ ${money(row.priciest.unit_cents)}/pc`,
  })),
}, null, 2));

function bucketStats(rows) {
  const byBucket = new Map();
  for (const offer of rows) {
    const unitCents = offer.list_price_cents / offer.quantity;
    const key = [offer.category, offer.prep ?? "any", offer.heat ?? "any", offer.build ?? "any"].join("|");
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key).push({ ...offer, unit_cents: unitCents });
  }

  const stats = [];
  for (const [key, bucketRows] of byBucket) {
    if (bucketRows.length < 2) continue;
    const chains = new Set(bucketRows.map((row) => row.chain_id));
    if (chains.size < 2) continue;
    bucketRows.sort((a, b) => a.unit_cents - b.unit_cents);
    const cheapest = bucketRows[0];
    const priciest = bucketRows[bucketRows.length - 1];
    const savePct = ((priciest.unit_cents - cheapest.unit_cents) / priciest.unit_cents) * 100;
    stats.push({
      bucket: key,
      category: cheapest.category,
      prep: cheapest.prep,
      heat: cheapest.heat,
      offer_count: bucketRows.length,
      chain_count: chains.size,
      cheapest: summarize(cheapest),
      priciest: summarize(priciest),
      save_pct: round1(savePct),
    });
  }
  return stats.sort((a, b) => b.save_pct - a.save_pct);
}

function summarize(offer) {
  return {
    chain: offer.chain_name ?? offer.chain_id,
    name: offer.original_name,
    quantity: offer.quantity,
    list_price_cents: offer.list_price_cents,
    unit_cents: round1(offer.unit_cents),
    store: offer.store_name,
  };
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
