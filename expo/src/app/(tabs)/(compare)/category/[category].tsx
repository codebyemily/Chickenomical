import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, BackLink, NoticeBand } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { CompareOfferCard } from '@/components/compare-offer-card';
import { FormField } from '@/components/form-field';
import { LinkPressable } from '@/components/link-pressable';
import { useRecentOffersQuery, useStoredOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryInfo } from '@/data/menu-schema';
import { comparisonMatrixGroups, exclusionText, isRankable, unitPrice } from '@/lib/compare';
import { decorative } from '@/lib/a11y';
import { isValidLatLng, withStraightLineDistance } from '@/lib/distance';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { usePrototype } from '@/state/prototype-context';
import { pageMetadata } from '@/data/page-metadata';
import { colors, fonts, spacing } from '@/theme';
import type { GenerateMetadataFunction } from 'expo-router/server';

type SortKey = 'unit' | 'total' | 'distance' | 'chain';

export const generateMetadata: GenerateMetadataFunction = (_request, params) => {
  const routeCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const label = routeCategory ? categoryInfo(routeCategory).label : 'Chicken';
  return pageMetadata(`${label} prices nearby`, `Compare recent ${label.toLocaleLowerCase()} menu prices by restaurant.`);
};

export default function CategoryResultsScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const { locationLabel, radiusMiles, searchSession } = usePrototype();
  const category = normalizeCategory(params.category);
  const details = categoryInfo(category);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [selectedChainId, setSelectedChainId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showUnrankable, setShowUnrankable] = useState(false);
  const query = useStoredOffersQuery();
  const recentQuery = useRecentOffersQuery();
  const boardQuery = query.status === 'success' ? query.metadata.query : null;
  const boardCoordinates = boardQuery
    ? { latitude: boardQuery.latitude, longitude: boardQuery.longitude }
    : null;
  const boardOrigin = boardCoordinates && isValidLatLng(boardCoordinates) ? boardCoordinates : null;
  const originPoint = searchSession
    ? { latitude: searchSession.latitude, longitude: searchSession.longitude }
    : boardOrigin;
  const nearbyRadiusMiles = searchSession?.radiusMiles ?? boardQuery?.radius_miles ?? radiusMiles;

  const boardRecords = query.status === 'success' ? withStraightLineDistance(query.data, originPoint) : [];
  const categoryRows = category
    ? boardRecords.filter(({ offer }) => offer.category === category)
    : [];
  const nearbyRows = categoryRows.filter(({ distance_miles }) =>
    distance_miles != null && distance_miles <= nearbyRadiusMiles,
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
  const origin = searchSession?.address
    ?? boardQuery?.address?.trim()
    ?? (boardOrigin ? `${boardOrigin.latitude.toFixed(4)}, ${boardOrigin.longitude.toFixed(4)}` : locationLabel);
  const allCategoryRows = query.status === 'success' ? categoryRows : [];
  const excludedFromRadius = allCategoryRows.length - nearbyRows.length;
  const recentCategoryCount = recentQuery.status === 'success'
    ? recentQuery.data.filter(({ offer }) => offer.category === category).length
    : 0;
  const hasNoCurrentOffers = query.status === 'success' && nearbyRows.length === 0;

  return (
    <AppFrame compact edgeToEdgeTop nativeSurface="compare" surface="compare" showDataNotice={false}>
      <View style={[styles.hero, Platform.OS !== 'web' && styles.heroNative, Platform.OS === 'web' && styles.heroWeb]}>
        {Platform.OS === 'web' ? (
          <LinkPressable
            href="/"
            replace
            accessibilityLabel="Back to Compare"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Compare</Text>
          </LinkPressable>
        ) : <BackLink label="Compare" tone="orange" />}
          <HeadingText level={1} style={styles.title}>{details.label} prices nearby</HeadingText>
        <Text style={styles.description}>
          Current offers within {nearbyRadiusMiles} miles, ranked by comparable pickup price.
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBox}>
          <Text {...decorative} style={styles.searchIcon}>⌕</Text>
          <FormField
            label={`Search ${details.label} offers`}
            placeholder={`Search ${details.label.toLocaleLowerCase()}, stores, or sources`}
            value={search}
            onChangeText={setSearch}
            submitLabel="search"
            appearance="search"
          />
          {search.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearch}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.sectionTitle}>{query.status === 'success' ? `${comparable.length} comparable offers` : 'Nearby offers'}</Text>
            <Text style={styles.subtitle}>
              {origin} - {nearbyRadiusMiles} mi - {chainOptions.length} {chainOptions.length === 1 ? 'restaurant' : 'restaurants'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtersOpen ? 'Done' : 'Filter'}
            accessibilityState={{ expanded: filtersOpen }}
            aria-expanded={filtersOpen}
            onPress={() => setFiltersOpen((open) => !open)}
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
            <Text style={styles.filterIcon}>☷</Text>
            <Text style={styles.filterText}>{filtersOpen ? 'Done' : 'Filter'}</Text>
          </Pressable>
        </View>

        {filtersOpen ? (
          <View style={styles.filterPanel}>
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
          <NoticeBand title="Loading nearby offers">Reading the latest menu data…</NoticeBand>
        ) : null}
        {query.status === 'error' ? (
          <NoticeBand title="Could not load nearby offers" tone="error">Menu data is temporarily unavailable. Try again in a moment.</NoticeBand>
        ) : null}

        {query.status === 'success' ? (
          <>
            <View style={styles.snapshot}>
              <View style={styles.snapshotTop}>
                <View style={[styles.statusDot, query.metadata.job?.status === 'running' && styles.statusDotRunning, query.metadata.job?.status === 'failed' && styles.statusDotFailed]} />
                <Text style={styles.snapshotTitle}>{jobStatus(query.metadata.job?.status ?? null)}</Text>
                <Text style={styles.snapshotCount}>{nearbyRows.length} nearby offers</Text>
              </View>
              <Text style={styles.snapshotCopy}>
                {query.metadata.observed_at ? `Updated ${formatTime(query.metadata.observed_at)}` : 'Update time unavailable'} - {query.metadata.offer_count} offers
              </Text>
              {query.metadata.job?.status === 'failed' ? (
                <Text style={styles.snapshotError}>The latest menu update did not finish. These offers may be from an earlier update.</Text>
              ) : null}
            </View>

            {nearbyRows.length === 0 ? (
              <NoticeBand title={`No current ${details.label.toLocaleLowerCase()} offers nearby`} tone="warning">
                {categoryRows.length > 0
                  ? `The current board returned ${categoryRows.length} ${categoryRows.length === 1 ? 'offer' : 'offers'} for this category, but none has a distance within ${nearbyRadiusMiles} miles of ${origin}.`
                  : query.metadata.job?.status === 'running'
                    ? 'The current update is still running. Results will appear here when it finishes.'
                    : `There are no ${details.label.toLocaleLowerCase()} offers for this area yet.`}
              </NoticeBand>
            ) : null}

            {filteredRows.length > 0 && comparable.length === 0 ? (
              <NoticeBand title="Offers found, but no fair price ranking yet" tone="warning">
                {unrankable.length} current offer{unrankable.length === 1 ? '' : 's'} match this category and distance, but none has all required verified pickup price and quantity fields.
              </NoticeBand>
            ) : null}

            {comparable.length > 0 && sortedGroups.length === 0 ? (
              <NoticeBand title="Offers could not be grouped for a fair comparison" tone="warning">
                These offers do not share a complete category and price variant.
              </NoticeBand>
            ) : null}

            {sortedGroups.length > 0 ? sortedGroups.map((group) => (
              <View key={group.key} style={styles.resultGroup}>
                <View style={styles.groupHeading}>
                  <HeadingText level={2} style={styles.groupTitle}>{group.label}</HeadingText>
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
                  accessibilityLabel={showUnrankable ? 'Hide other current offers' : 'Show other current offers'}
                  accessibilityState={{ expanded: showUnrankable }}
                  aria-expanded={showUnrankable}
                  onPress={() => setShowUnrankable((open) => !open)}
                  style={({ pressed }) => [styles.unrankedToggle, pressed && styles.pressed]}>
                  <View style={styles.titleCopy}>
                    <Text style={styles.sectionTitle}>Other current offers - {unrankable.length}</Text>
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
              <Text style={styles.radiusNote}>{excludedFromRadius} offer{excludedFromRadius === 1 ? '' : 's'} omitted because a distance within {nearbyRadiusMiles} miles was not available.</Text>
            ) : null}
          </>
        ) : null}

        {hasNoCurrentOffers ? (
          <View style={styles.historyCard}>
            {recentQuery.status === 'loading' ? (
              <Text style={styles.historyCopy}>Checking saved offers…</Text>
            ) : recentQuery.status === 'error' ? (
              <Text style={styles.historyCopy}>Saved offers are temporarily unavailable.</Text>
            ) : (
              <Text style={styles.historyCopy}>
                {recentCategoryCount > 0
                  ? `${recentCategoryCount} saved ${recentCategoryCount === 1 ? 'offer is' : 'offers are'} available for ${details.label.toLocaleLowerCase()} from other locations.`
                  : `No saved ${details.label.toLocaleLowerCase()} offers were found in the latest update.`}
              </Text>
            )}
            <Text style={styles.historyNote}>Their coordinates are included in the nearby ranking when they fall inside this distance.</Text>
            <LinkPressable href="/sources" style={({ pressed }) => [styles.sourcesLink, pressed && styles.pressed]}>
              <Text style={styles.sourcesLinkText}>Browse Sources</Text>
              <Text style={styles.sourcesArrow}>→</Text>
            </LinkPressable>
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
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function UnrankableRow({ record, jobId }: { record: OfferRecord; jobId?: string }) {
  return (
    <LinkPressable
      href={offerDetailRoute(record.offer.id, jobId) as never}
      accessibilityHint="Opens the current offer details."
      style={({ pressed }) => [styles.unrankableRow, pressed && styles.pressed]}>
      <View style={styles.unrankableCopy}>
        <Text style={styles.unrankableChain}>{record.chain.name}</Text>
        <Text style={styles.unrankableName}>{record.offer.original_name}</Text>
        <Text numberOfLines={1} style={styles.unrankableLocation}>
          {record.location.store_name ?? record.location.address ?? 'Store unavailable'} - {record.distance_miles?.toFixed(1) ?? '—'} mi
        </Text>
        <Text style={styles.unrankableReason}>{exclusionText(record.offer)}</Text>
      </View>
      <Text style={styles.unrankableArrow}>›</Text>
    </LinkPressable>
  );
}

function jobStatus(status: string | null) {
  if (!status) return 'Latest offers';
  if (status === 'running') return 'Updating';
  if (status === 'succeeded') return 'Up to date';
  if (status === 'failed') return 'Needs an update';
  return 'Updating';
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
  heroNative: { marginHorizontal: -spacing.lg, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  heroWeb: { marginHorizontal: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  backButton: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backArrow: { color: colors.black, fontFamily: fonts.regular, fontSize: 26, lineHeight: 29 },
  backText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  title: { color: colors.black, fontFamily: fonts.bold, fontSize: 31, lineHeight: 35, letterSpacing: -0.8 },
  description: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  content: { gap: spacing.lg, paddingTop: spacing.lg },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.purple, borderRadius: 30 },
  searchIcon: { color: colors.purple, fontFamily: fonts.bold, fontSize: 23, lineHeight: 27 },
  searchInput: { flex: 1, minWidth: 0, color: colors.black, fontFamily: fonts.regular, fontSize: 14, paddingVertical: spacing.sm },
  clearSearchButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  clearSearch: { color: colors.purple, fontFamily: fonts.bold, fontSize: 22, paddingHorizontal: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleCopy: { flex: 1, minWidth: 0, gap: 2 },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  filterButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.black, borderRadius: 24, backgroundColor: colors.white },
  filterIcon: { color: colors.black, fontSize: 17 },
  filterText: { color: colors.black, fontFamily: fonts.medium, fontSize: 13 },
  filterPanel: { gap: spacing.sm, padding: spacing.md, borderRadius: 18, backgroundColor: colors.sky },
  sortSection: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  chipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  chipText: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  chipTextSelected: { color: colors.white, fontFamily: fonts.bold },
  snapshot: { gap: 4, padding: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: colors.statusOlive },
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
  historyCopy: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  historyNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  sourcesLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: 24, backgroundColor: colors.purple },
  sourcesLinkText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  sourcesArrow: { color: colors.white, fontSize: 17 },
  pressed: { opacity: 0.7 },
});
