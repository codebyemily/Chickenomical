import { readFileSync } from "node:fs";
import { comparisonRows } from "./comparison.mjs";

const [directPath, ...marketplacePaths] = process.argv.slice(2);
if (!directPath || marketplacePaths.length === 0) {
  console.error("Usage: npm run compare -- <brightdata-location.json> <apify-offers.json> [...]");
  process.exit(1);
}

const direct = flattenDirect(JSON.parse(readFileSync(directPath, "utf8")));
const marketplace = marketplacePaths.flatMap((path) => JSON.parse(readFileSync(path, "utf8")).offers ?? []);
const rows = comparisonRows(direct, marketplace);
console.log(JSON.stringify({ matched: rows.length, rows }, null, 2));

function flattenDirect(document) {
  return (document.chains ?? []).flatMap((chain) => (chain.stores ?? []).flatMap((store) => store.offers ?? []));
}
