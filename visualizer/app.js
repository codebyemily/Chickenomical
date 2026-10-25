import { ConvexHttpClient } from "https://esm.sh/convex@1.21.0/browser";
import { config as localConfig } from "./config.local.js";

const $ = (id) => document.getElementById(id);
const config = {
  convexUrl: localConfig.convexUrl,
  siteUrl: localConfig.siteUrl,
  ingestSecret: localConfig.ingestSecret,
};

const state = {
  data: null,
  offers: [],
  filtered: [],
  jobId: null,
  pollTimer: null,
};

const client = new ConvexHttpClient(config.convexUrl);

const money = (cents) => cents == null || Number.isNaN(cents) ? "—" : `$${(cents / 100).toFixed(2)}`;
const title = (value) => String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase());
const dateLabel = (value) => value
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";
const chainName = (id) => ({
  "raising-canes": "Raising Cane's",
  jollibee: "Jollibee",
  wingstop: "Wingstop",
  popeyes: "Popeyes",
  wendys: "Wendy's",
  mcdonalds: "McDonald's",
  "chick-fil-a": "Chick-fil-A",
}[id] ?? id);

function flatten(data) {
  return data.chains.flatMap((chain) =>
    (chain.stores ?? []).flatMap((store) =>
      (store.offers ?? []).map((offer) => ({
        ...offer,
        chain_name: chain.name ?? chainName(offer.chain_id),
        store_name: offer.store_name ?? store.name,
        distance_miles: offer.distance_miles ?? store.distance_miles,
      })),
    ),
  );
}

function setStatus(message, kind = "") {
  const el = $("scrapeStatus");
  el.textContent = message;
  el.className = `scrape-status${kind ? ` is-${kind}` : ""}`;
}

function renderSummary() {
  const d = state.data;
  const priced = state.offers.filter((o) => o.list_price_cents != null);
  const lowest = [...priced].sort((a, b) => a.list_price_cents - b.list_price_cents)[0];
  $("searchAddress").textContent = d.query?.address ?? "Unknown origin";
  $("radius").textContent = d.query?.radius_miles != null ? `${d.query.radius_miles} mi` : "—";
  $("channel").textContent = (d.query?.ordering_channel ?? "first_party_pickup").replaceAll("_", " ");
  $("observedAt").textContent = d.observed_at ? `Observed ${dateLabel(d.observed_at)}` : "Waiting for scrape…";
  $("chainCount").textContent = d.chains?.length ?? 0;
  $("pricedCount").textContent = priced.length;
  $("offerTotal").textContent = priced.length;
  if (lowest) {
    $("lowestPrice").textContent = money(lowest.list_price_cents);
    $("lowestName").textContent = lowest.original_name;
    $("lowestMeta").textContent = `${lowest.chain_name} · ${lowest.store_name ?? "store"} · ${lowest.quantity || 1} piece${lowest.quantity === 1 ? "" : "s"} · ${lowest.validation_status ?? "verified"}`;
  } else {
    $("lowestPrice").textContent = "—";
    $("lowestName").textContent = "No priced offers yet";
    $("lowestMeta").textContent = "Run a scrape to populate Convex";
  }
  $("footerStatus").textContent = `${state.offers.length} rows / ${d.chains?.length ?? 0} chains · job ${d.job?.status ?? "none"}`;
}

function populateFilters() {
  const chainFilter = $("chainFilter");
  const categoryFilter = $("categoryFilter");
  chainFilter.innerHTML = '<option value="all">All chains</option>';
  categoryFilter.innerHTML = '<option value="all">All chicken</option>';
  const chains = [...new Map(state.offers.map((o) => [o.chain_id, o.chain_name]))];
  chains.forEach(([id, name]) => {
    chainFilter.insertAdjacentHTML("beforeend", `<option value="${id}">${name}</option>`);
  });
  [...new Set(state.offers.map((o) => o.category).filter(Boolean))].sort().forEach((category) => {
    categoryFilter.insertAdjacentHTML("beforeend", `<option value="${category}">${title(category)}</option>`);
  });
}

function renderStores() {
  const chains = state.data?.chains ?? [];
  if (!chains.length) {
    $("storeList").innerHTML = '<p class="empty" style="padding:18px 0">No stores in Convex for this job yet.</p>';
    return;
  }
  const max = Math.max(...chains.map((c) => c.stores?.[0]?.offer_count || c.stores?.[0]?.offers?.length || 0), 1);
  $("storeList").innerHTML = chains.map((chain) => {
    const store = chain.stores?.[0];
    const count = store?.offer_count ?? store?.offers?.length ?? 0;
    return `<article class="store"><div class="store-top"><div class="store-name-large">${chain.name}</div><div class="distance">${store?.distance_miles != null ? store.distance_miles.toFixed(2) : "—"} mi</div></div><p class="store-address">${store?.address ?? "No store returned"}</p><div class="store-bar"><span style="width:${(count / max) * 100}%"></span></div><div class="store-footer"><span>${count} priced offer${count === 1 ? "" : "s"}</span><span>${store?.pickup ? "PICKUP" : "UNAVAILABLE"}</span></div></article>`;
  }).join("");
}

function renderRows() {
  const query = $("search").value.toLowerCase().trim();
  const chain = $("chainFilter").value;
  const category = $("categoryFilter").value;
  const sort = $("sortFilter").value;
  let rows = state.offers.filter((o) =>
    o.list_price_cents != null
    && (chain === "all" || o.chain_id === chain)
    && (category === "all" || o.category === category)
    && (!query || `${o.original_name} ${o.chain_name} ${o.store_name}`.toLowerCase().includes(query)));
  rows.sort((a, b) =>
    sort === "unit"
      ? (a.list_price_cents / (a.quantity || 1)) - (b.list_price_cents / (b.quantity || 1))
      : sort === "distance"
        ? (a.distance_miles ?? 999) - (b.distance_miles ?? 999)
        : sort === "chain"
          ? a.chain_name.localeCompare(b.chain_name)
          : a.list_price_cents - b.list_price_cents);
  state.filtered = rows;
  $("resultCount").textContent = `${rows.length} result${rows.length === 1 ? "" : "s"}`;
  const priced = state.offers.filter((o) => o.list_price_cents != null);
  const best = priced.length ? Math.min(...priced.map((o) => o.list_price_cents)) : null;
  $("offerRows").innerHTML = rows.length
    ? rows.map((o) => `<tr class="${o.list_price_cents === best ? "best-row" : ""}"><td><div class="offer-name">${o.original_name}${o.list_price_cents === best ? '<span class="best-tag">LOWEST</span>' : ""}</div><div class="offer-sub">${(o.offer_kind ?? "").replaceAll("_", " ")}${o.heat && o.heat !== "none" ? ` · ${o.heat}` : ""}</div></td><td><div class="chain-name">${o.chain_name}</div><div class="store-name">${o.store_name ?? "—"} · ${o.distance_miles != null ? o.distance_miles.toFixed(2) : "—"} mi</div></td><td><span class="type-chip">${title(o.category)}</span></td><td class="price">${money(o.list_price_cents)}</td><td class="unit">${money(o.list_price_cents / (o.quantity || 1))}<small> / pc</small></td></tr>`).join("")
    : '<tr><td colspan="5" class="empty">No priced offers match these filters.</td></tr>';
}

function applyBoard(data) {
  state.data = data;
  state.offers = flatten(data);
  renderSummary();
  populateFilters();
  renderStores();
  renderRows();
}

async function loadBoard(jobId = state.jobId) {
  const data = await client.query("offers:board", jobId ? { jobId } : {});
  applyBoard(data);
  return data;
}

async function pollJob(jobId) {
  clearInterval(state.pollTimer);
  state.jobId = jobId;
  const tick = async () => {
    try {
      const job = await client.query("scrapeNear:jobById", { jobId });
      if (!job) {
        setStatus("Job not found.", "error");
        clearInterval(state.pollTimer);
        return;
      }
      if (job.status === "running") {
        setStatus(`Scraping “${job.address ?? "location"}”… Convex job ${jobId.slice(-6)}`, "running");
        await loadBoard(jobId);
        return;
      }
      clearInterval(state.pollTimer);
      $("scrapeButton").disabled = false;
      await loadBoard(jobId);
      if (job.status === "failed") {
        setStatus(`Scrape failed: ${job.error ?? "unknown error"}`, "error");
      } else {
        setStatus(`Scrape complete — ${job.offer_count} offers in Convex.`, "ok");
      }
    } catch (error) {
      console.error(error);
      setStatus(`Poll error: ${error.message ?? error}`, "error");
      $("scrapeButton").disabled = false;
      clearInterval(state.pollTimer);
    }
  };
  await tick();
  state.pollTimer = setInterval(tick, 4000);
}

async function startScrape(event) {
  event.preventDefault();
  if (!config.ingestSecret || config.ingestSecret.includes("YOUR-")) {
    setStatus("Set ingestSecret in visualizer/config.local.js first.", "error");
    return;
  }
  const address = $("addressInput").value.trim();
  const radius = Number($("radiusInput").value) || 8;
  const chains = [...document.querySelectorAll('input[name="chain"]:checked')].map((el) => el.value);
  if (!address) {
    setStatus("Enter a location (e.g. San Francisco, CA).", "error");
    return;
  }
  if (!chains.length) {
    setStatus("Select at least one chain.", "error");
    return;
  }

  $("scrapeButton").disabled = true;
  setStatus(`Starting Convex scrape for “${address}”…`, "running");
  try {
    const response = await fetch(`${config.siteUrl.replace(/\/$/, "")}/scrape/near`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.ingestSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address, radius_miles: radius, limit: 1, chains }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 200)}`);
    const started = JSON.parse(text);
    setStatus(`Job ${started.jobId} running on Convex…`, "running");
    await pollJob(started.jobId);
  } catch (error) {
    console.error(error);
    setStatus(`Could not start scrape: ${error.message ?? error}`, "error");
    $("scrapeButton").disabled = false;
  }
}

async function init() {
  ["search", "chainFilter", "categoryFilter", "sortFilter"].forEach((id) => {
    $(id).addEventListener("input", renderRows);
  });
  $("scrapeForm").addEventListener("submit", startScrape);

  try {
    setStatus(`Connected to ${config.convexUrl.replace("https://", "")}`);
    const data = await loadBoard();
    if (data.job?.status === "running") {
      $("scrapeButton").disabled = true;
      await pollJob(data.job._id);
    } else if (data.offer_count) {
      setStatus(`Loaded ${data.offer_count} offers from Convex.`, "ok");
    } else {
      setStatus("Convex is empty for this board. Enter a location and scrape.", "");
    }
  } catch (error) {
    console.error(error);
    $("offerRows").innerHTML = `<tr><td colspan="5" class="empty">Could not reach Convex (${error.message ?? error}). Check visualizer/config.local.js.</td></tr>`;
    setStatus(`Convex connection failed: ${error.message ?? error}`, "error");
  }
}

init();
