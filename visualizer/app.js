const source = '../scrapers/brightdata/out/offers/location.json';
const $ = (id) => document.getElementById(id);
const state = { data:null, offers:[], filtered:[] };

const money = (cents) => cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;
const title = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const dateLabel = (value) => new Intl.DateTimeFormat('en-US', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));

function flatten(data) {
  return data.chains.flatMap(chain => chain.stores.flatMap(store => store.offers.map(offer => ({...offer, chain_name:chain.name}))));
}

function renderSummary() {
  const d = state.data; const priced = state.offers.filter(o => o.list_price_cents != null);
  const lowest = [...priced].sort((a,b) => a.list_price_cents - b.list_price_cents)[0];
  $('searchAddress').textContent = d.query.address;
  $('radius').textContent = `${d.query.radius_miles} mi`;
  $('channel').textContent = d.query.ordering_channel.replaceAll('_',' ');
  $('observedAt').textContent = `Observed ${dateLabel(d.observed_at)}`;
  $('chainCount').textContent = d.chains.length;
  $('pricedCount').textContent = priced.length;
  $('offerTotal').textContent = priced.length;
  $('lowestPrice').textContent = money(lowest.list_price_cents);
  $('lowestName').textContent = lowest.original_name;
  $('lowestMeta').textContent = `${lowest.chain_name} · ${lowest.store_name} · ${lowest.quantity || 1} piece${lowest.quantity === 1 ? '' : 's'} · verified`;
  $('footerStatus').textContent = `${state.offers.length} rows / ${d.chains.length} chains`;
}

function populateFilters() {
  const chains = [...new Map(state.offers.map(o => [o.chain_id, o.chain_name]))];
  chains.forEach(([id,name]) => $('chainFilter').insertAdjacentHTML('beforeend', `<option value="${id}">${name}</option>`));
  [...new Set(state.offers.map(o => o.category))].sort().forEach(category => $('categoryFilter').insertAdjacentHTML('beforeend', `<option value="${category}">${title(category)}</option>`));
}

function renderStores() {
  const max = Math.max(...state.data.chains.map(c => c.stores[0]?.offers.length || 0));
  $('storeList').innerHTML = state.data.chains.map(chain => { const store = chain.stores[0]; const count = store?.offers.length || 0; return `<article class="store"><div class="store-top"><div class="store-name-large">${chain.name}</div><div class="distance">${store ? store.distance_miles.toFixed(2) : '—'} mi</div></div><p class="store-address">${store ? store.address : 'No store returned'}</p><div class="store-bar"><span style="width:${max ? (count/max)*100 : 0}%"></span></div><div class="store-footer"><span>${count} priced offer${count === 1 ? '' : 's'}</span><span>${store?.pickup ? 'PICKUP' : 'UNAVAILABLE'}</span></div></article>`; }).join('');
}

function renderRows() {
  const query = $('search').value.toLowerCase().trim(); const chain = $('chainFilter').value; const category = $('categoryFilter').value; const sort = $('sortFilter').value;
  let rows = state.offers.filter(o => o.list_price_cents != null && (chain === 'all' || o.chain_id === chain) && (category === 'all' || o.category === category) && (!query || `${o.original_name} ${o.chain_name} ${o.store_name}`.toLowerCase().includes(query)));
  rows.sort((a,b) => sort === 'unit' ? (a.list_price_cents/a.quantity) - (b.list_price_cents/b.quantity) : sort === 'distance' ? a.distance_miles-b.distance_miles : sort === 'chain' ? a.chain_name.localeCompare(b.chain_name) : a.list_price_cents-b.list_price_cents);
  state.filtered = rows; $('resultCount').textContent = `${rows.length} result${rows.length === 1 ? '' : 's'}`;
  const best = Math.min(...state.offers.filter(o => o.list_price_cents != null).map(o => o.list_price_cents));
  $('offerRows').innerHTML = rows.length ? rows.map(o => `<tr class="${o.list_price_cents === best ? 'best-row' : ''}"><td><div class="offer-name">${o.original_name}${o.list_price_cents === best ? '<span class="best-tag">LOWEST</span>' : ''}</div><div class="offer-sub">${o.offer_kind.replaceAll('_',' ')}${o.heat && o.heat !== 'none' ? ` · ${o.heat}` : ''}</div></td><td><div class="chain-name">${o.chain_name}</div><div class="store-name">${o.store_name} · ${o.distance_miles.toFixed(2)} mi</div></td><td><span class="type-chip">${title(o.category)}</span></td><td class="price">${money(o.list_price_cents)}</td><td class="unit">${money(o.list_price_cents / o.quantity)}<small> / pc</small></td></tr>`).join('') : '<tr><td colspan="5" class="empty">No priced offers match these filters.</td></tr>';
}

async function init() {
  try { const response = await fetch(source); if (!response.ok) throw new Error(`Could not load ${source}`); state.data = await response.json(); state.offers = flatten(state.data); renderSummary(); populateFilters(); renderStores(); renderRows(); }
  catch (error) { $('offerRows').innerHTML = `<tr><td colspan="5" class="empty">Unable to load the observation. Serve the repository from a local web server so the JSON can be fetched.</td></tr>`; console.error(error); }
}
['search','chainFilter','categoryFilter','sortFilter'].forEach(id => $(id).addEventListener('input', renderRows));
init();
