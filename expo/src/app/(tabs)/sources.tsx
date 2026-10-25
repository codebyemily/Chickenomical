import { useMemo, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { FormField } from '@/components/form-field';
import { LinkPressable } from '@/components/link-pressable';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryInfo, categoryLabel, categoryUnit, type MenuCategory } from '@/data/menu-schema';
import { isRankable, money, unitPrice } from '@/lib/compare';
import { sourceRecordRoute } from '@/lib/live-offer-routes';
import { colors, fonts, spacing } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

type CategoryFilter = { kind: 'all' } | { kind: 'unclassified' } | { kind: 'category'; value: MenuCategory };
type ReviewFilter = 'all' | 'comparable' | 'review';
type SortKey = 'recent' | 'total' | 'unit' | 'chain';

const EMPTY_RECORDS: OfferRecord[] = [];
const REVIEW_FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'All offers' },
  { id: 'comparable', label: 'Comparable flag on' },
  { id: 'review', label: 'Needs review' },
];

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Chicken menu sources',
  'Browse recent chicken menu records with their providers, locations, prices, and validation details.',
);

export default function SourcesScreen() {
  const boardQuery = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();
  const recentStatus = recentQuery.status;
  const records = recentQuery.status === 'success' ? recentQuery.data : EMPTY_RECORDS;
  const job = boardQuery.status === 'success' ? boardQuery.metadata.job : null;
  const [search, setSearch] = useState('');
  const [chainId, setChainId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>({ kind: 'all' });
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [visibleLimit, setVisibleLimit] = useState(24);

  const chains = useMemo(() => {
    const byId = new Map(records.map(({ chain }) => [chain.id, chain]));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);
  const categories = useMemo(() => {
    return [...new Set(records.flatMap(({ offer }) => offer.category ? [offer.category] : []))]
      .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  }, [records]);
  const providerCount = useMemo(() => new Set(records.map(({ offer }) => offer.source_provider.trim()).filter(Boolean)).size, [records]);
  const pricedCount = useMemo(() => records.filter(({ offer }) => offer.list_price_cents != null).length, [records]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleRecords = useMemo(() => {
    const matching = records.filter(({ offer, chain, location }) => {
      if (chainId && chain.id !== chainId) return false;
      if (category.kind === 'unclassified' && offer.category) return false;
      if (category.kind === 'category' && offer.category !== category.value) return false;
      if (reviewFilter === 'comparable' && !offer.comparable) return false;
      if (reviewFilter === 'review' && offer.comparable && offer.validation_status === 'verified') return false;
      if (!normalizedSearch) return true;
      const sourceId = offer.source_item_id?.trim() ?? '';
      const haystack = [
        offer.original_name,
        String(offer.id),
        offer.source_provider,
        offer.source_url,
        sourceId,
        offer.offer_key,
        offer.product_key,
        offer.ordering_channel,
        offer.validation_status,
        chain.name,
        location.store_name,
        location.address,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(normalizedSearch);
    });

    return matching.sort((a, b) => {
      if (sortBy === 'chain') {
        return a.chain.name.localeCompare(b.chain.name) || a.offer.original_name.localeCompare(b.offer.original_name);
      }
      if (sortBy === 'total') {
        return a.offer.currency.localeCompare(b.offer.currency) || compareOptional(a.offer.list_price_cents, b.offer.list_price_cents) || b.offer.observed_at.localeCompare(a.offer.observed_at);
      }
      if (sortBy === 'unit') {
        const aUnit = unitPrice(a.offer);
        const bUnit = unitPrice(b.offer);
        return a.offer.currency.localeCompare(b.offer.currency) || compareOptional(aUnit, bUnit) || b.offer.observed_at.localeCompare(a.offer.observed_at);
      }
      return dateValue(b.offer.observed_at) - dateValue(a.offer.observed_at);
    });
  }, [category, chainId, normalizedSearch, records, reviewFilter, sortBy]);

  function clearFilters() {
    setSearch('');
    setChainId(null);
    setCategory({ kind: 'all' });
    setReviewFilter('all');
    setSortBy('recent');
  }

  return (
    <AppFrame active="Explore">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>CHICKENOMICAL · SOURCE CHECK</Text>
          <HeadingText level={1} style={styles.heroTitle}>Follow each offer to its source.</HeadingText>
          <Text style={styles.heroDescription}>Browse the latest stored Convex menu offers across chains and categories. Search an item, provider, or source ID, then inspect its provenance.</Text>
          <View style={styles.heroWave}>
            <View style={styles.waveDot} />
            <View style={styles.waveLine} />
            <View style={styles.waveDotSmall} />
            <View style={styles.waveLine} />
            <View style={styles.waveDot} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="LATEST STORED ROWS" value={recentQuery.status === 'success' ? String(records.length) : '—'} tone="lime" />
          <SummaryCard label="SOURCE PROVIDERS" value={recentQuery.status === 'success' ? String(providerCount) : '—'} tone="sky" />
          <SummaryCard label="WITH A LIST PRICE" value={recentQuery.status === 'success' ? String(pricedCount) : '—'} tone="white" />
        </View>

        <Text style={styles.scopeNote}>Showing up to 200 most recently stored menuOffers. Records can span multiple chains, locations, and scrape times; this is not a single nearby search.</Text>

        <View style={styles.searchField}>
          <Text accessibilityElementsHidden style={styles.searchGlyph}>⌕</Text>
          <FormField
            label="Search menu offers and their sources"
            onChangeText={setSearch}
            placeholder="Item, chain, provider, or source ID"
            value={search}
            submitLabel="search"
            appearance="search"
          />
        </View>

        <FilterSection label="MENU CATEGORY">
          <ChipRow>
            <FilterChip label="All chicken" selected={category.kind === 'all'} onPress={() => setCategory({ kind: 'all' })} />
            {categories.map((value) => (
              <FilterChip key={value} label={categoryInfo(value).label} selected={category.kind === 'category' && category.value === value} onPress={() => setCategory({ kind: 'category', value })} />
            ))}
            {records.some(({ offer }) => !offer.category) ? (
              <FilterChip label="Unclassified" selected={category.kind === 'unclassified'} onPress={() => setCategory({ kind: 'unclassified' })} />
            ) : null}
          </ChipRow>
        </FilterSection>

        <FilterSection label="CHAIN">
          <ChipRow>
            <FilterChip label="All chains" selected={chainId === null} onPress={() => setChainId(null)} />
            {chains.map((chain) => (
              <FilterChip key={chain.id} label={chain.name} selected={chainId === chain.id} onPress={() => setChainId(chain.id)} />
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection label="RECORD STATUS">
          <ChipRow>
            {REVIEW_FILTERS.map((filter) => (
              <FilterChip key={filter.id} label={filter.label} selected={reviewFilter === filter.id} onPress={() => setReviewFilter(filter.id)} />
            ))}
          </ChipRow>
        </FilterSection>

        {job?.status === 'running' ? (
          <NoticeBand title="Latest board scrape is running">
            Convex currently reports {job.offer_count} offers for this job. Explorer rows below still come from the latest stored records across jobs.
          </NoticeBand>
        ) : null}
        {job?.status === 'failed' ? (
          <NoticeBand title="Latest board scrape failed" tone="error">
            `The latest menu check did not finish. ${job.offer_count} offers were reported.`
          </NoticeBand>
        ) : null}
        {boardQuery.status === 'error' ? (
          <NoticeBand title="Latest board metadata is unavailable" tone="warning">
            The current board metadata is temporarily unavailable. Stored records remain available from the separate recent-offers query below.
          </NoticeBand>
        ) : null}

        <View style={styles.resultsHeading}>
          <View style={styles.resultsTitleBlock}>
            <Text style={styles.sectionEyebrow}>RECENT STORED MENU OFFERS</Text>
            <HeadingText level={2} style={styles.sectionTitle}>Source trail</HeadingText>
          </View>
          <Text style={styles.resultsCount}>{recentStatus === 'success' ? `${visibleRecords.length} found` : '—'}</Text>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>SORT</Text>
          {([
            { id: 'recent', label: 'Recent' },
            { id: 'total', label: 'Total' },
            { id: 'unit', label: `/${category.kind === 'category' ? categoryUnit(category.value, 1) : 'unit'}` },
            { id: 'chain', label: 'Chain' },
          ] as { id: SortKey; label: string }[]).map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: sortBy === option.id }}
              aria-pressed={sortBy === option.id}
              onPress={() => setSortBy(option.id)}
              style={({ pressed }) => [styles.sortChip, sortBy === option.id && styles.sortChipSelected, pressed && styles.pressed]}>
              <Text style={[styles.sortChipText, sortBy === option.id && styles.sortChipTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <QueryStatePanel status={recentStatus} />
        {recentStatus === 'success' && visibleRecords.length > 0 ? (
          <View style={styles.recordList}>
            {visibleRecords.slice(0, visibleLimit).map((record, index) => (
              <SourceOfferCard
                key={record.offer.id}
                record={record}
                tone={index % 3 === 0 ? 'lime' : index % 3 === 1 ? 'sky' : 'plain'}
              />
            ))}
          </View>
        ) : null}
        {recentStatus === 'success' && visibleLimit < visibleRecords.length ? (
          <View style={styles.moreResults}>
            <Text style={styles.moreResultsNote}>Showing {Math.min(visibleLimit, visibleRecords.length)} of {visibleRecords.length} matching records.</Text>
            <ActionButton kind="secondary" onPress={() => setVisibleLimit((current) => Math.min(current + 24, visibleRecords.length))}>
              Show more source records
            </ActionButton>
          </View>
        ) : null}
        {recentStatus === 'success' && visibleRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{records.length === 0 ? 'No stored menu offers were returned.' : 'No offers match these filters.'}</Text>
            <Text style={styles.emptyCopy}>{records.length === 0 ? 'This list reads the latest stored rows from the Convex menuOffers table.' : 'Clear the search or reset the filters to see more source records.'}</Text>
            {records.length > 0 ? (
              <ActionButton kind="primary" onPress={clearFilters}>Reset search and filters</ActionButton>
            ) : null}
          </View>
        ) : null}

      </View>
    </AppFrame>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'lime' | 'sky' | 'white' }) {
  return (
    <View style={[styles.summaryCard, tone === 'lime' ? styles.summaryLime : tone === 'sky' ? styles.summarySky : styles.summaryWhite]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FilterSection({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: PropsWithChildren) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{children}</ScrollView>;
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, selected && styles.filterChipSelected, pressed && styles.pressed]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SourceOfferCard({
  record,
  tone,
}: {
  record: OfferRecord;
  tone: 'lime' | 'sky' | 'plain';
}) {
  const { offer, chain, location } = record;
  const sourceId = offer.source_item_id?.trim() || String(offer.id);
  const providerHost = sourceHost(offer.source_url);
  const rankable = isRankable(offer);
  const unitLabel = offer.category ? categoryUnit(offer.category, 1) : 'unit';

  return (
    <LinkPressable
      href={sourceRecordRoute(String(offer.id)) as never}
      accessibilityLabel={`Open source record for ${offer.original_name} from ${chain.name}`}
      style={({ pressed }) => [styles.recordCard, tone === 'lime' ? styles.recordLime : tone === 'sky' ? styles.recordSky : styles.recordPlain, pressed && styles.pressed]}>
      <View style={styles.recordTop}>
        <View style={styles.recordMain}>
          <Text numberOfLines={2} style={styles.recordName}>{offer.original_name}</Text>
          <Text style={styles.recordChain}>{chain.name} · {location.store_name?.trim() || location.id}</Text>
        </View>
        <View style={styles.recordPriceBlock}>
          <Text style={styles.recordPrice}>{safeMoney(offer.list_price_cents, offer.currency)}</Text>
          <Text style={styles.recordPriceLabel}>list price</Text>
        </View>
      </View>

      <View style={styles.recordBadges}>
        <Text style={styles.categoryBadge}>{categoryLabel(offer.category)}</Text>
        <Text style={[styles.statusBadge, offer.comparable && styles.statusBadgeComparable]}>{offer.comparable ? 'Comparable flag on' : 'Not marked comparable'}</Text>
      </View>

      <View style={styles.sourceDetail}>
        <View style={styles.sourceLine}>
          <Text style={styles.sourceLabel}>PROVIDER</Text>
          <Text style={styles.sourceValue}>{offer.source_provider || 'Not stated'}{providerHost ? ` · ${providerHost}` : ''}</Text>
        </View>
        <View style={styles.sourceLine}>
          <Text style={styles.sourceLabel}>SOURCE ITEM</Text>
          <Text numberOfLines={1} selectable style={styles.sourceValue}>{sourceId}</Text>
        </View>
      </View>

      <View style={styles.recordFooter}>
        <Text style={styles.recordMeta}>{offer.validation_status} · {formatObservedAt(offer.observed_at)}</Text>
        <Text style={styles.unitPrice}>{rankable ? `${safeMoney(unitPrice(offer), offer.currency)} / ${unitLabel}` : 'Not rankable'}</Text>
      </View>
      <Text style={styles.openTrail}>Inspect source trail →</Text>
    </LinkPressable>
  );
}

function compareOptional(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function dateValue(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function safeMoney(cents: number | null | undefined, currency = 'USD') {
  if (cents == null) return '—';
  try {
    return money(cents, currency);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function sourceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function formatObservedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time not stated';
  return `observed ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: 20, paddingBottom: spacing.sm, backgroundColor: colors.cream },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.orange, borderRadius: 26, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34, gap: 9 },
  heroEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.1 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7 },
  heroDescription: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, maxWidth: 620 },
  scopeNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: -12 },
  heroWave: { position: 'absolute', bottom: 10, left: 20, right: 20, height: 8, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.62 },
  waveLine: { height: 2, flex: 1, borderRadius: 2, backgroundColor: colors.cream },
  waveDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: colors.cream },
  waveDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cream },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, minWidth: 0, minHeight: 82, borderRadius: 18, padding: 11, justifyContent: 'space-between' },
  summaryLime: { backgroundColor: colors.lime },
  summarySky: { backgroundColor: colors.sky },
  summaryWhite: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule },
  summaryLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.45 },
  summaryValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 23, lineHeight: 26 },
  searchField: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: colors.purple, borderRadius: 30, paddingHorizontal: 17, backgroundColor: colors.white },
  searchGlyph: { color: colors.purple, fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, transform: [{ rotate: '-20deg' }] },
  filterSection: { gap: 8 },
  filterLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.9 },
  chipRow: { gap: 8, paddingRight: 4 },
  filterChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.warmRule, backgroundColor: colors.white },
  filterChipSelected: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterChipText: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  filterChipTextSelected: { color: colors.white, fontFamily: fonts.bold },
  resultsHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 3 },
  resultsTitleBlock: { gap: 1 },
  sectionEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  sectionTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontSize: 25, lineHeight: 31 },
  resultsCount: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, paddingBottom: 4 },
  sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  sortLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.7, marginRight: 2 },
  sortChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 24, borderWidth: 1, borderColor: colors.warmRule, backgroundColor: colors.white },
  sortChipSelected: { backgroundColor: colors.purple, borderColor: colors.purple },
  sortChipText: { color: colors.black, fontFamily: fonts.medium, fontSize: 11 },
  sortChipTextSelected: { color: colors.white, fontFamily: fonts.bold },
  recordList: { gap: 10 },
  recordCard: { padding: 15, borderRadius: 21, gap: 10, borderWidth: 1, borderColor: 'transparent' },
  recordLime: { backgroundColor: colors.lime },
  recordSky: { backgroundColor: colors.sky },
  recordPlain: { backgroundColor: colors.white, borderColor: colors.warmRule },
  recordTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  recordMain: { flex: 1, minWidth: 0, gap: 4 },
  recordName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  recordChain: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  recordPriceBlock: { alignItems: 'flex-end', paddingTop: 1 },
  recordPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 23 },
  recordPriceLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  recordBadges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  categoryBadge: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, backgroundColor: colors.cream, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  statusBadge: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, backgroundColor: '#F7E6DD', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  statusBadgeComparable: { backgroundColor: colors.white },
  sourceDetail: { paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.12)', gap: 5 },
  sourceLine: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sourceLabel: { width: 80, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5 },
  sourceValue: { flex: 1, minWidth: 0, color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  recordFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  recordMeta: { flex: 1, minWidth: 180, color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  unitPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 18, textAlign: 'right' },
  openTrail: { alignSelf: 'flex-end', color: colors.purple, fontFamily: fonts.bold, fontSize: 11 },
  emptyState: { padding: 20, borderRadius: 20, backgroundColor: colors.sky, gap: 8 },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },
  emptyCopy: { color: colors.black, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  moreResults: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  moreResultsNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  dealsNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.72 },
});
