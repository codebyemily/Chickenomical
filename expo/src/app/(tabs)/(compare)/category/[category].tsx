import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppFrame, NoticeBand } from '@/components/app-frame';
import { CompareOfferCard } from '@/components/compare-offer-card';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryInfo } from '@/data/menu-schema';
import { comparisonMatrixGroups, exclusionText, isRankable, unitPrice } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing } from '@/theme';

type SortKey = 'unit' | 'total' | 'distance' | 'chain';

export default function CategoryResultsScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const router = useRouter();
  const { locationLabel, radiusMiles } = usePrototype();
  const category = normalizeCategory(params.category);
  const details = categoryInfo(category);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [selectedChainId, setSelectedChainId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showUnrankable, setShowUnrankable] = useState(false);
  const query = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();

  const boardRecords = query.status === 'success' ? query.data : [];
  const categoryRows = category
    ? boardRecords.filter(({ offer }) => offer.category === category)
    : [];
  const nearbyRows = categoryRows.filter(({ distance_miles }) =>
    distance_miles != null && distance_miles <= radiusMiles,
  );
  const chainOptions = [...new Map(nearbyRows.map(({ chain }) => [chain.id, chain.name] as const))]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const searchTerm = search.trim().toLocaleLowerCase();
  const filteredRows = nearbyRows
    .filter(({ chain }) => selectedChainId === 'all' || chain.id === selectedChainId)
    .filter((record) => matchesSearch(searchTerm, record));
  const comparable = filteredRows.filter(({ offer }) => isRankable(offer));
  const unrankable = filteredRows.filter(({ offer }) => !isRankable(offer));
  const groups = comparisonMatrixGroups(comparable, category ?? '');
  const sortedGroups = groups
    .map((group) => ({
      ...group,
      records: sortRecords(group.records, sortBy),
    }))
    .sort((a, b) => compareRecords(a.records[0], b.records[0], sortBy) || a.label.localeCompare(b.label));
  const origin = query.status === 'success'
    ? query.metadata.query.address?.trim() || locationLabel
    : locationLabel;
  const allCategoryRows = query.status === 'success' ? categoryRows : [];
  const excludedFromRadius = allCategoryRows.length - nearbyRows.length;
  const recentCategoryCount = recentQuery.status === 'success'
    ? recentQuery.data.filter(({ offer }) => offer.category === category).length
    : 0;
  const hasNoCurrentOffers = query.status === 'success' && nearbyRows.length === 0;

  return (
    <AppFrame compact showDataNotice={false}>
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Compare"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Compare</Text>
        </Pressable>
        <Text style={styles.eyebrow}>LIVE CONVEX BOARD · {origin.toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.title}>Cheapest {details.label} near you</Text>
        <Text style={styles.description}>
          Current scrape offers within {radiusMiles} miles, ranked by comparable pickup price.
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon} accessibilityElementsHidden>⌕</Text>
          <TextInput
            accessibilityLabel={`Search ${details.label} offers`}
            placeholder={`Search ${details.label.toLocaleLowerCase()}, stores, or sources`}
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}>
              <Text style={styles.clearSearch}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.sectionEyebrow}>CHEAPEST FIRST</Text>
            <Text style={styles.sectionTitle}>{query.status === 'success' ? `${comparable.length} comparable offers` : 'Nearby offers'}</Text>
            <Text style={styles.subtitle}>
              {origin} · {radiusMiles} mi · {chainOptions.length} {chainOptions.length === 1 ? 'chain' : 'chains'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen((open) => !open)}
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
            <Text style={styles.filterIcon}>☷</Text>
            <Text style={styles.filterText}>{filtersOpen ? 'Done' : 'Filter'}</Text>
          </Pressable>
        </View>

        {filtersOpen ? (
          <View style={styles.filterPanel}>
            <Text style={styles.sectionEyebrow}>RESTAURANT CHAIN</Text>
            <View style={styles.chips}>
              <FilterChip label="All chains" selected={selectedChainId === 'all'} onPress={() => setSelectedChainId('all')} />
              {chainOptions.map((chain) => (
                <FilterChip
                  key={chain.id}
                  label={chain.name}
                  selected={selectedChainId === chain.id}
                  onPress={() => setSelectedChainId(chain.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sortSection}>
          <Text style={styles.sectionEyebrow}>SORT BY</Text>
          <View style={styles.chips}>
            {([
              { id: 'total', label: 'Total' },
              { id: 'unit', label: '$/' + details.unit },
              { id: 'distance', label: 'Distance' },
              { id: 'chain', label: 'Chain A–Z' },
            ] as { id: SortKey; label: string }[]).map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                selected={sortBy === option.id}
                onPress={() => setSortBy(option.id)}
              />
            ))}
          </View>
        </View>

        {query.status === 'loading' ? (
          <NoticeBand title="Loading nearby menu records">Reading the current category board from Convex…</NoticeBand>
        ) : null}
        {query.status === 'error' ? (
          <NoticeBand title="Could not load nearby offers" tone="error">{query.error.message}</NoticeBand>
        ) : null}

        {query.status === 'success' ? (
          <>
            <View style={styles.snapshot}>
              <View style={styles.snapshotTop}>
                <View style={[styles.statusDot, query.metadata.job?.status === 'running' && styles.statusDotRunning, query.metadata.job?.status === 'failed' && styles.statusDotFailed]} />
                <Text style={styles.snapshotTitle}>{jobStatus(query.metadata.job?.status ?? null)}</Text>
                <Text style={styles.snapshotCount}>{nearbyRows.length} nearby rows</Text>
              </View>
              <Text style={styles.snapshotCopy}>
                {query.metadata.observed_at ? `Observed ${formatTime(query.metadata.observed_at)}` : 'Observation time unavailable'} · {query.metadata.offer_count} board offers
              </Text>
              {query.metadata.job?.status === 'failed' && query.metadata.job.error ? (
                <Text style={styles.snapshotError}>{query.metadata.job.error}</Text>
              ) : null}
            </View>

            {nearbyRows.length === 0 ? (
              <NoticeBand title={`No current ${details.label.toLocaleLowerCase()} offers nearby`} tone="warning">
                {categoryRows.length > 0
                  ? `The current board returned ${categoryRows.length} ${categoryRows.length === 1 ? 'offer' : 'offers'} for this category, but none has a distance within ${radiusMiles} miles of ${origin}.`
                  : query.metadata.job?.status === 'running'
                    ? 'The current scrape is still running. Results will appear here when this board updates.'
                    : `The current Convex board has no ${details.label.toLocaleLowerCase()} offers for this area yet.`}
              </NoticeBand>
            ) : null}

            {nearbyRows.length > 0 && comparable.length === 0 ? (
              <NoticeBand title="Offers found, but no fair price ranking yet" tone="warning">
                {unrankable.length} current offer{unrankable.length === 1 ? '' : 's'} match this category and distance, but none has all required verified pickup price and quantity fields.
              </NoticeBand>
            ) : null}

            {comparable.length > 0 && sortedGroups.length === 0 ? (
              <NoticeBand title="Offers could not be grouped for a fair comparison" tone="warning">
                These records do not share a complete comparable category and price variant.
              </NoticeBand>
            ) : null}

            {sortedGroups.length > 0 ? sortedGroups.map((group) => (
              <View key={group.key} style={styles.resultGroup}>
                <View style={styles.groupHeading}>
                  <Text accessibilityRole="header" style={styles.groupTitle}>{group.label}</Text>
                  <Text style={styles.groupCount}>{group.records.length}</Text>
                </View>
                {group.records.map((record, index) => (
                  <CompareOfferCard
                    key={record.offer.id}
                    record={record}
                    jobId={query.metadata.job?._id}
                    rank={index + 1}
                    tone={index === 0 ? 'lime' : index === 1 ? 'sky' : 'plain'}
                    primaryMetric={sortBy === 'chain' ? 'unit' : sortBy}
                  />
                ))}
              </View>
            )) : null}

            {unrankable.length > 0 ? (
              <View style={styles.unrankedSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showUnrankable }}
                  onPress={() => setShowUnrankable((open) => !open)}
                  style={({ pressed }) => [styles.unrankedToggle, pressed && styles.pressed]}>
                  <View style={styles.titleCopy}>
                    <Text style={styles.sectionEyebrow}>SEPARATE FROM CHEAPEST RANKING</Text>
                    <Text style={styles.sectionTitle}>Other current offers · {unrankable.length}</Text>
                  </View>
                  <Text style={styles.disclosure}>{showUnrankable ? '−' : '+'}</Text>
                </Pressable>
                {showUnrankable ? unrankable.map((record) => (
                  <UnrankableRow
                    key={record.offer.id}
                    record={record}
                    jobId={query.metadata.job?._id}
                  />
                )) : null}
              </View>
            ) : null}

            {searchTerm.length > 0 && filteredRows.length === 0 ? (
              <NoticeBand title="No offers match this search" tone="warning">Try a shorter search or clear the search field.</NoticeBand>
            ) : null}
            {selectedChainId !== 'all' && filteredRows.length === 0 && searchTerm.length === 0 ? (
              <NoticeBand title="No offers for this chain in the selected area" tone="warning">Choose All chains to see other current board results.</NoticeBand>
            ) : null}
            {excludedFromRadius > 0 ? (
              <Text style={styles.radiusNote}>{excludedFromRadius} current board offer{excludedFromRadius === 1 ? '' : 's'} omitted because the database did not return a distance within {radiusMiles} miles.</Text>
            ) : null}
          </>
        ) : null}

        {hasNoCurrentOffers ? (
          <View style={styles.historyCard}>
            <Text style={styles.historyEyebrow}>RECENT STORED RECORDS</Text>
            {recentQuery.status === 'loading' ? (
              <Text style={styles.historyCopy}>Checking saved Convex records…</Text>
            ) : recentQuery.status === 'error' ? (
              <Text style={styles.historyCopy}>Saved-record coverage is temporarily unavailable.</Text>
            ) : (
              <Text style={styles.historyCopy}>
                {recentCategoryCount > 0
                  ? `${recentCategoryCount} saved ${recentCategoryCount === 1 ? 'record exists' : 'records exist'} for ${details.label.toLocaleLowerCase()} from other scrape times or locations.`
                  : `No saved ${details.label.toLocaleLowerCase()} records were returned in the latest database sample.`}
              </Text>
            )}
            <Text style={styles.historyNote}>These records are not included in the nearby ranking.</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/sources' as never)} style={({ pressed }) => [styles.sourcesLink, pressed && styles.pressed]}>
              <Text style={styles.sourcesLinkText}>Browse Sources</Text>
              <Text style={styles.sourcesArrow}>→</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </AppFrame>
  );
}

function normalizeCategory(value: string | string[] | undefined) {
  const category = Array.isArray(value) ? value[0] : value;
  return category?.trim() || null;
}

function matchesSearch(searchTerm: string, record: OfferRecord) {
  if (!searchTerm) return true;
  const values = [
    record.chain.id,
    record.chain.name,
    record.location.store_name,
    record.location.address,
    record.offer.original_name,
    record.offer.quantity_label,
    record.offer.category,
    record.offer.offer_kind,
    record.offer.prep,
    record.offer.heat,
    record.offer.ordering_channel,
    record.offer.source_provider,
    record.offer.source_url,
    record.offer.source_item_id,
    record.offer.id,
  ];
  return values.some((value) => value?.toLocaleLowerCase().includes(searchTerm));
}

function sortRecords(records: OfferRecord[], sortBy: SortKey) {
  return [...records].sort((a, b) => compareRecords(a, b, sortBy));
}

function compareRecords(a: OfferRecord, b: OfferRecord, sortBy: SortKey) {
  const aTotal = a.offer.list_price_cents ?? Number.POSITIVE_INFINITY;
  const bTotal = b.offer.list_price_cents ?? Number.POSITIVE_INFINITY;
  const aUnit = unitPrice(a.offer) ?? Number.POSITIVE_INFINITY;
  const bUnit = unitPrice(b.offer) ?? Number.POSITIVE_INFINITY;
  const aDistance = a.distance_miles ?? Number.POSITIVE_INFINITY;
  const bDistance = b.distance_miles ?? Number.POSITIVE_INFINITY;
  const delta = sortBy === 'chain'
    ? a.chain.name.localeCompare(b.chain.name)
    : sortBy === 'total'
      ? aTotal - bTotal
      : sortBy === 'distance'
        ? aDistance - bDistance
        : aUnit - bUnit;
  return delta || a.chain.name.localeCompare(b.chain.name) || aTotal - bTotal;
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function UnrankableRow({ record, jobId }: { record: OfferRecord; jobId?: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Opens the current offer details."
      onPress={() => router.push(offerDetailRoute(record.offer.id, jobId) as never)}
      style={({ pressed }) => [styles.unrankableRow, pressed && styles.pressed]}>
      <View style={styles.unrankableCopy}>
        <Text style={styles.unrankableChain}>{record.chain.name}</Text>
        <Text style={styles.unrankableName}>{record.offer.original_name}</Text>
        <Text numberOfLines={1} style={styles.unrankableLocation}>
          {record.location.store_name ?? record.location.address ?? 'Store unavailable'} · {record.distance_miles?.toFixed(1) ?? '—'} mi
        </Text>
        <Text style={styles.unrankableReason}>{exclusionText(record.offer)}</Text>
      </View>
      <Text style={styles.unrankableArrow}>›</Text>
    </Pressable>
  );
}

function jobStatus(status: string | null) {
  if (!status) return 'No scrape job recorded';
  if (status === 'running') return 'Scrape running';
  if (status === 'succeeded') return 'Latest scrape completed';
  if (status === 'failed') return 'Latest scrape failed';
  return `Scrape ${status}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.orange,
    borderRadius: 28,
  },
  backButton: { minHeight: 40, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backArrow: { color: colors.black, fontFamily: fonts.regular, fontSize: 26, lineHeight: 29 },
  backText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  eyebrow: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.55 },
  title: { color: colors.black, fontFamily: fonts.bold, fontSize: 31, lineHeight: 35, letterSpacing: -0.8 },
  description: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  content: { gap: spacing.lg, paddingTop: spacing.lg },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.purple, borderRadius: 30 },
  searchIcon: { color: colors.purple, fontFamily: fonts.bold, fontSize: 23, lineHeight: 27 },
  searchInput: { flex: 1, minWidth: 0, color: colors.black, fontFamily: fonts.regular, fontSize: 14, paddingVertical: spacing.sm },
  clearSearch: { color: colors.purple, fontFamily: fonts.bold, fontSize: 22, paddingHorizontal: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleCopy: { flex: 1, minWidth: 0, gap: 2 },
  sectionEyebrow: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.55 },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  filterButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.black, borderRadius: 24, backgroundColor: colors.white },
  filterIcon: { color: colors.black, fontSize: 17 },
  filterText: { color: colors.black, fontFamily: fonts.medium, fontSize: 13 },
  filterPanel: { gap: spacing.sm, padding: spacing.md, borderRadius: 18, backgroundColor: colors.sky },
  sortSection: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  chipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  chipText: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  chipTextSelected: { color: colors.white, fontFamily: fonts.bold },
  snapshot: { gap: 4, padding: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: '#5A8C2C' },
  statusDotRunning: { backgroundColor: colors.orange },
  statusDotFailed: { backgroundColor: colors.danger },
  snapshotTitle: { flex: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 12 },
  snapshotCount: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9 },
  snapshotCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  snapshotError: { color: colors.danger, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  resultGroup: { gap: spacing.sm },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.warmRule },
  groupTitle: { flex: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  groupCount: { minWidth: 24, textAlign: 'center', color: colors.black, fontFamily: fonts.monoBold, fontSize: 11 },
  unrankedSection: { gap: spacing.sm, paddingTop: spacing.sm },
  unrankedToggle: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.purpleSoft, borderRadius: 18 },
  disclosure: { color: colors.purple, fontFamily: fonts.bold, fontSize: 23 },
  unrankableRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  unrankableCopy: { flex: 1, minWidth: 0, gap: 2 },
  unrankableChain: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  unrankableName: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  unrankableLocation: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  unrankableReason: { color: colors.warning, fontFamily: fonts.medium, fontSize: 10 },
  unrankableArrow: { color: colors.purple, fontSize: 23 },
  radiusNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  historyCard: { gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.sky, borderRadius: 22 },
  historyEyebrow: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5 },
  historyCopy: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  historyNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  sourcesLink: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: 24, backgroundColor: colors.purple },
  sourcesLinkText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  sourcesArrow: { color: colors.white, fontSize: 17 },
  pressed: { opacity: 0.7 },
});
