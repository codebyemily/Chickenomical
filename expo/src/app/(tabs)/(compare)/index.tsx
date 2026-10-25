import { Collapsible, Column as ExpoColumn, Host, Row as ExpoRow, Text as ExpoText } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { CompareOfferCard, FeaturedOfferCard } from '@/components/compare-offer-card';
import { CategoryPicker } from '@/components/category-picker';
import { FormField } from '@/components/form-field';
import { LinkPressable } from '@/components/link-pressable';
import { QueryStatePanel } from '@/components/query-state-panel';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryInfo } from '@/data/menu-schema';
import { comparisonMatrixGroups, exclusionText, isRankable, unitPrice } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { usePrototype } from '@/state/prototype-context';
import { pageMetadata } from '@/data/page-metadata';
import { colors, fonts, spacing, tabular } from '@/theme';
import type { GenerateMetadataFunction } from 'expo-router/server';

type Screen = 'home' | 'all';
type SortKey = 'unit' | 'total' | 'distance' | 'chain';
const COMPARISON_PAGE_SIZE = 24;

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Compare chicken menu prices',
  'Compare recent chicken menu prices, pack sizes, nearby locations, and the source records behind each offer.',
);

export default function CompareScreen() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const { category, setCategory, locationLabel, radiusMiles } = usePrototype();
  const viewParam = Array.isArray(params.view) ? params.view[0] : params.view;
  const screen: Screen = viewParam === 'all' ? 'all' : 'home';
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [selectedChainId, setSelectedChainId] = useState('all');
  const [visiblePage, setVisiblePage] = useState({ key: '', count: COMPARISON_PAGE_SIZE });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const query = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();

  const inRadius = query.status === 'success'
    ? query.data.filter(({ distance_miles }) => distance_miles != null && distance_miles <= radiusMiles)
    : [];
  const boardRecords = query.status === 'success' ? query.data : [];
  const recentRecords = recentQuery.status === 'success' ? recentQuery.data : [];
  const catalogById = new Map<string, OfferRecord>();
  for (const record of recentRecords) catalogById.set(String(record.offer.id), record);
  for (const record of boardRecords) catalogById.set(String(record.offer.id), record);
  const catalogRecords = [...catalogById.values()];
  const categoryOptions = [...new Set(catalogRecords.flatMap(({ offer }) => offer.category ? [offer.category] : []))]
    .sort((a, b) => categoryInfo(a).label.localeCompare(categoryInfo(b).label));
  const defaultCategory = categoryOptions[0];
  const activeCategory = categoryOptions.includes(category) ? category : defaultCategory;
  const categoryFilter = activeCategory ?? '';
  const categoryIsAvailable = activeCategory === category;
  useEffect(() => {
    if (query.status === 'success' && defaultCategory && !categoryIsAvailable) {
      setCategory(defaultCategory);
    }
  }, [categoryIsAvailable, defaultCategory, query.status, setCategory]);
  const chainOptions = Array.from(
    new Map(inRadius.map(({ chain }) => [chain.id, chain.name] as const)),
    ([id, name]) => ({ id, name }),
  )
    .sort((a, b) => a.name.localeCompare(b.name));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const comparisonPageKey = JSON.stringify([activeCategory, normalizedSearch, radiusMiles, selectedChainId, sortBy]);
  const visibleComparisonCount = visiblePage.key === comparisonPageKey ? visiblePage.count : COMPARISON_PAGE_SIZE;
  const categoryRecords = activeCategory
    ? inRadius.filter(({ offer }) => offer.category === activeCategory)
    : [];
  const matchingRecords = query.status === 'success'
    ? categoryRecords
      .filter(({ chain }) => selectedChainId === 'all' || chain.id === selectedChainId)
      .filter((record) => matchesSearch(normalizedSearch,
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
      ))
    : [];
  const comparable = matchingRecords.filter(({ offer }) => isRankable(offer));
  const excluded = matchingRecords.filter(({ offer }) => !isRankable(offer));
  const groups = comparisonMatrixGroups(comparable, categoryFilter);
  const displayGroups = groups
    .map((group) => ({ ...group, records: sortRecords(group.records, sortBy) }))
    .sort((a, b) => compareRecords(a.records[0], b.records[0], sortBy) || a.label.localeCompare(b.label));
  let remainingVisibleCount = visibleComparisonCount;
  const visibleGroups: typeof displayGroups = [];
  for (const group of displayGroups) {
    if (remainingVisibleCount <= 0) break;
    const records = group.records.slice(0, remainingVisibleCount);
    visibleGroups.push({ ...group, records });
    remainingVisibleCount -= records.length;
  }
  const visibleOfferCount = visibleComparisonCount - remainingVisibleCount;
  const totalDisplayOfferCount = displayGroups.reduce((count, group) => count + group.records.length, 0);
  const remainingOfferCount = totalDisplayOfferCount - visibleOfferCount;
  const nextPageSize = Math.min(COMPARISON_PAGE_SIZE, remainingOfferCount);
  const featuredGroup = [...groups].sort((a, b) =>
    new Set(b.records.map(({ chain }) => chain.id)).size - new Set(a.records.map(({ chain }) => chain.id)).size ||
    b.records.length - a.records.length ||
    a.label.localeCompare(b.label),
  )[0];
  const bestValue = featuredGroup ? [...featuredGroup.records].sort((a, b) =>
    unitPrice(a.offer)! - unitPrice(b.offer)! ||
    a.offer.list_price_cents! - b.offer.list_price_cents! ||
    (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY),
  )[0] : undefined;
  const lowestTotal = featuredGroup ? [...featuredGroup.records].sort((a, b) =>
    a.offer.list_price_cents! - b.offer.list_price_cents! ||
    a.offer.quantity! - b.offer.quantity! ||
    (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY),
  )[0] : undefined;
  const nearbyStores = nearestStores(comparable);
  const origin = query.status === 'success'
    ? query.metadata.query.address?.trim() || locationLabel
    : locationLabel;
  const categoryDetails = activeCategory
    ? categoryInfo(activeCategory)
    : { label: 'All categories', unit: 'item', plural: 'items' };
  const categoryCoverage = new Map(categoryOptions.map((value) => {
    const rows = catalogRecords.filter(({ offer }) => offer.category === value);
    return [value, {
      rows: rows.length,
      chains: new Set(rows.map(({ chain }) => chain.id)).size,
    }] as const;
  }));
  const sortValues = ['$/' + categoryDetails.unit, 'Total', 'Distance', 'Chain A–Z'];

  return (
    <AppFrame active="Compare" compact surface="compare">
      <View style={styles.screen}>
        {screen === 'home' ? (
          <View style={styles.hero}>
            <Text style={styles.brand}>Chickenomical</Text>
            <HeadingText level={1} style={styles.heroTitle}>What are you in the mood for?</HeadingText>
            <Text style={styles.heroDescription}>Compare nearby pickup prices for chicken favorites.</Text>
          </View>
        ) : null}

        <View style={styles.inner}>
          {screen === 'all' ? (
            <View style={styles.allHeader}>
              <LinkPressable
                href="/"
                replace
                accessibilityLabel="Back to Compare"
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <Text style={styles.backArrow}>‹</Text>
                <Text style={styles.backText}>Compare</Text>
              </LinkPressable>
              <View style={styles.allTitleRow}>
                <View style={styles.allTitleCopy}>
                  <HeadingText level={1} style={styles.allTitle}>All comparisons</HeadingText>
                  <Text style={styles.allSubtitle}>
                    {comparable.length} matches · {categoryDetails.label} · {origin}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: filtersOpen }}
                  aria-expanded={filtersOpen}
                  onPress={() => setFiltersOpen((value) => !value)}
                  style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
                  <FilterMark />
                  <Text style={styles.filterLabel}>{filtersOpen ? 'Done' : 'Filter'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <SearchField value={search} onChangeText={setSearch} />

          {screen === 'home' ? (
            <View style={styles.homeControls}>
              <View style={styles.categoryGridHeading}>
                <Text style={styles.eyebrow}>PRODUCT SELECTION</Text>
                <HeadingText level={2} style={styles.categoryGridTitle}>Choose a chicken category</HeadingText>
                <Text style={styles.categoryGridNote}>Categories and counts come from the current board and up to 200 latest stored records.</Text>
              </View>
              <View style={styles.categoryGrid}>
                {categoryOptions.map((option, index) => {
                  const selected = activeCategory === option;
                  const coverage = categoryCoverage.get(option);
                  return (
                  <Pressable
                    key={option}
                    accessibilityRole="link"
                    accessibilityLabel={`${categoryInfo(option).label}, ${coverage?.rows ?? 0} returned offers across ${coverage?.chains ?? 0} ${coverage?.chains === 1 ? 'chain' : 'chains'}`}
                    accessibilityState={{ selected }}
                    aria-pressed={selected}
                    onPress={() => {
                      setCategory(option);
                      router.push(`/category/${encodeURIComponent(option)}` as never);
                    }}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      index % 3 === 1 && styles.categoryCardSky,
                      index % 3 === 2 && styles.categoryCardWhite,
                      selected && styles.categoryCardSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.categoryCardTitle, selected && styles.categoryCardTitleSelected]}>{categoryInfo(option).label}</Text>
                    <Text style={[styles.categoryCardMeta, selected && styles.categoryCardMetaSelected]}>
                      {coverage?.rows ?? 0} offers · {coverage?.chains ?? 0} {coverage?.chains === 1 ? 'chain' : 'chains'}
                    </Text>
                  </Pressable>
                  );
                })}
                {categoryOptions.length === 0 ? (
                  <Text style={styles.categoryEmpty}>
                    {recentQuery.status === 'loading' || query.status === 'loading'
                      ? 'Loading categories from Convex…'
                      : 'Convex has not returned any classified menu categories yet.'}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <LocationBand origin={origin} radiusMiles={radiusMiles} />

          {screen === 'all' ? (
            <>
              <View style={styles.sortSection}>
                <Text style={styles.eyebrow}>SORT EACH COMPARABLE SET BY</Text>
                <View style={styles.sortOptions}>
                  {([
                    { id: 'total', label: 'Total' },
                    { id: 'unit', label: sortValues[0] },
                    { id: 'distance', label: 'Distance' },
                    { id: 'chain', label: sortValues[3] },
                  ] as { id: SortKey; label: string }[]).map((option) => (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={option.id === 'chain' ? 'Sort by chain name, A to Z' : undefined}
                      accessibilityState={{ selected: sortBy === option.id }}
                      aria-pressed={sortBy === option.id}
                      onPress={() => setSortBy(option.id)}
                      style={({ pressed }) => [styles.sortChip, sortBy === option.id && styles.sortChipSelected, pressed && styles.pressed]}>
                      <Text style={[styles.sortChipText, sortBy === option.id && styles.sortChipTextSelected]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {filtersOpen ? (
                <View style={styles.filterPanel}>
                  <Text style={styles.eyebrow}>CATEGORY</Text>
                  <CategoryPicker value={category} onChange={setCategory} categories={categoryOptions} />
                  <Text style={styles.eyebrow}>CHAIN</Text>
                  <View style={styles.quickCategories}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedChainId === 'all' }}
                      aria-pressed={selectedChainId === 'all'}
                      onPress={() => setSelectedChainId('all')}
                      style={({ pressed }) => [styles.categoryChip, selectedChainId === 'all' && styles.categoryChipSelected, pressed && styles.pressed]}>
                      <Text style={[styles.categoryChipText, selectedChainId === 'all' && styles.categoryChipTextSelected]}>All chains</Text>
                    </Pressable>
                    {chainOptions.map((chain) => (
                      <Pressable
                        key={chain.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedChainId === chain.id }}
                        aria-pressed={selectedChainId === chain.id}
                        onPress={() => setSelectedChainId(chain.id)}
                        style={({ pressed }) => [styles.categoryChip, selectedChainId === chain.id && styles.categoryChipSelected, pressed && styles.pressed]}>
                        <Text style={[styles.categoryChipText, selectedChainId === chain.id && styles.categoryChipTextSelected]}>{chain.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <LocationBand origin={origin} radiusMiles={radiusMiles} compact />
                </View>
              ) : null}
            </>
          ) : null}

          {query.status === 'success' ? (
            <SnapshotSummary
              metadata={query.metadata}
              boardRows={query.data.length}
              matchCount={comparable.length}
              chainCount={new Set(comparable.map(({ chain }) => chain.id)).size}
              compact={screen === 'all'}
            />
          ) : null}
          <QueryStatePanel status={query.status} />
          {screen === 'home' && query.status !== 'success' ? (
            <RecentCoverage records={recentQuery.status === 'success' ? recentQuery.data : []} status={recentQuery.status} />
          ) : null}

          {query.status === 'success' && screen === 'home' ? (
            <>
              {bestValue && lowestTotal && featuredGroup ? (
                <View style={styles.featureSection}>
                  <View style={styles.sectionHeading}>
                    <View>
                      <Text style={styles.sectionEyebrow}>COMPARABLE PICKS</Text>
                      <HeadingText level={2} style={styles.sectionTitle}>Best nearby value</HeadingText>
                    </View>
                    <Text style={styles.offerCount}>{featuredGroup.records.length} offers</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.variantCaption}>{featuredGroup.label}</Text>
                  <View style={styles.featureCards}>
                    <FeaturedOfferCard record={bestValue} jobId={query.metadata.job?._id} kind="unit" />
                    <FeaturedOfferCard record={lowestTotal} jobId={query.metadata.job?._id} kind="total" />
                  </View>
                </View>
              ) : (
                <NoticeBand title="No comparable prices in this area yet" tone="warning">
                  {query.metadata.job?.status === 'running'
                    ? 'The latest crawl is still running. Categories above come from saved Convex records; nearby comparisons will update when the current board returns offers.'
                    : matchingRecords.length === 0
                      ? 'No offers in this category are in the current crawl. Browse Sources for stored records from other scrape times and locations.'
                      : 'Offers are present, but none has the verified pickup price and piece count needed for a fair comparison.'}
                </NoticeBand>
              )}

              <LinkPressable
                accessibilityLabel={'See all comparisons, ' + comparable.length + ' offers'}
                href="/?view=all"
                style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}>
                <Text style={styles.seeAllText}>See all comparisons ({comparable.length})</Text>
                <Text accessibilityElementsHidden style={styles.seeAllArrow}>→</Text>
              </LinkPressable>

              {nearbyStores.length > 0 ? <NearbyStores records={nearbyStores} /> : null}
              <RecentCoverage records={recentQuery.status === 'success' ? recentQuery.data : []} status={recentQuery.status} />
              {excluded.length > 0 ? (
                <Text style={styles.exclusionHint}>{excluded.length} additional offers are outside the comparable-price rules. Review them in All comparisons.</Text>
              ) : null}
            </>
          ) : null}

          {query.status === 'success' && screen === 'all' ? (
            <>
              <Text style={styles.listGuide}>Offers stay grouped by menu variant, currency, and pickup channel. Pack size and total remain visible.</Text>
              {displayGroups.length > 0 ? visibleGroups.map((group) => (
                <View key={group.key} style={styles.resultsGroup}>
                  <View style={styles.groupHeading}>
                    <HeadingText level={3} style={styles.groupTitle}>{group.label}</HeadingText>
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
              )) : (
                <NoticeBand title="No matching pickup prices" tone="warning">
                  {normalizedSearch
                    ? 'Try a shorter search or clear the search field.'
                    : matchingRecords.length === 0
                      ? 'There are no offers in the saved distance for this category yet.'
                      : 'Offers were found, but none meets the verified price and count rules for comparison.'}
                </NoticeBand>
              )}

              {remainingOfferCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${nextPageSize} more offers. ${remainingOfferCount} remaining.`}
                  onPress={() => setVisiblePage({ key: comparisonPageKey, count: visibleComparisonCount + COMPARISON_PAGE_SIZE })}
                  style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
                  <Text style={styles.loadMoreText}>Show {nextPageSize} more {nextPageSize === 1 ? 'offer' : 'offers'}</Text>
                  <Text style={styles.loadMoreCount}>{remainingOfferCount} remaining</Text>
                </Pressable>
              ) : null}

              {excluded.length > 0 ? (
                <Host matchContents style={styles.excludedHost}>
                  <Collapsible
                    isOpen={showExcluded}
                    onOpenChange={setShowExcluded}
                    label={'Not compared · ' + excluded.length}
                    labelStyle={styles.excludedSummaryText}>
                    <ExpoColumn style={{ width: '100%' }} spacing={8}>
                      {excluded.map((record) => (
                        <ExpoRow key={record.offer.id} alignment="center" style={{ width: '100%' }} spacing={8}>
                          <ExpoColumn style={{ width: '78%' }} spacing={2}>
                            <ExpoText numberOfLines={1} textStyle={styles.excludedName}>{record.chain.name + ' · ' + record.offer.original_name}</ExpoText>
                            <ExpoText numberOfLines={2} textStyle={styles.excludedMeta}>{exclusionText(record.offer)}</ExpoText>
                          </ExpoColumn>
                          <LinkPressable href={offerDetailRoute(record.offer.id, query.metadata.job?._id) as never} style={styles.inspectLink}>
                            <Text style={styles.inspectText}>View offer</Text>
                          </LinkPressable>
                        </ExpoRow>
                      ))}
                    </ExpoColumn>
                  </Collapsible>
                </Host>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </AppFrame>
  );
}

function SearchField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.searchBox}>
      <View accessibilityElementsHidden style={styles.searchIcon}>
        <View style={styles.searchLens} />
        <View style={styles.searchHandle} />
      </View>
      <FormField
        label="Search menu offers"
        value={value}
        onChangeText={onChangeText}
        placeholder="Crispy chicken nuggets"
        submitLabel="search"
        appearance="search"
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} style={styles.clearSearch}>
          <Text style={styles.clearSearchText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LocationBand({ origin, radiusMiles, compact = false }: { origin: string; radiusMiles: number; compact?: boolean }) {
  return (
    <LinkPressable
      href="/location"
      accessibilityLabel={'Search area: ' + origin + '. Saved distance: ' + radiusMiles + ' miles. Change area and distance.'}
      style={({ pressed }) => [styles.locationBand, compact && styles.locationBandCompact, pressed && styles.pressed]}>
      <View style={styles.pinMark} accessibilityElementsHidden><View style={styles.pinCenter} /></View>
      <View style={styles.locationCopy}>
        <Text numberOfLines={1} style={styles.locationName}>{origin}</Text>
        <Text style={styles.locationHint}>Saved distance · {radiusMiles} mi</Text>
      </View>
      <Text style={styles.changeLink}>Change</Text>
    </LinkPressable>
  );
}

function SnapshotSummary({
  metadata,
  boardRows,
  matchCount,
  chainCount,
  compact = false,
}: {
  metadata: { query: { radius_miles: number | null }; observed_at: string | null; job: { status: string; error?: string | null; offer_count: number } | null; offer_count: number };
  boardRows: number;
  matchCount: number;
  chainCount: number;
  compact?: boolean;
}) {
  const status = formatJobStatus(metadata.job);
  const failed = metadata.job?.status === 'failed';
  return (
    <View style={[styles.snapshotCard, compact && styles.snapshotCardCompact, failed && styles.snapshotCardFailed]}>
      <View style={styles.snapshotTitleRow}>
        <View style={[styles.statusDot, failed && styles.statusDotFailed, metadata.job?.status === 'running' && styles.statusDotRunning]} />
        <Text style={styles.snapshotTitle}>{status}</Text>
        <Text style={styles.snapshotCount}>{matchCount} matches · {chainCount} {chainCount === 1 ? 'chain' : 'chains'}</Text>
      </View>
      <Text style={styles.snapshotLine}>
        {metadata.offer_count} board offers · {boardRows} rows returned · {metadata.query.radius_miles == null ? 'crawl radius not recorded' : metadata.query.radius_miles + ' mi crawl'}
      </Text>
      <Text style={styles.snapshotLine}>Board observed {formatObservedAt(metadata.observed_at)}</Text>
      {metadata.job?.status === 'succeeded' ? (
        <Text style={styles.snapshotLine}>Scrape-reported offers: {metadata.job.offer_count}</Text>
      ) : null}
      {failed ? <Text style={styles.snapshotError}>The latest menu check did not finish. These records may be from an earlier check.</Text> : null}
    </View>
  );
}

function RecentCoverage({
  records,
  status,
}: {
  records: OfferRecord[];
  status: 'loading' | 'success' | 'error';
}) {
  const chainNames = [...new Map(records.map(({ chain }) => [chain.id, chain.name] as const)).values()]
    .sort((a, b) => a.localeCompare(b));
  const categories = [...new Set(records.flatMap(({ offer }) => offer.category ? [offer.category] : []))]
    .sort((a, b) => categoryInfo(a).label.localeCompare(categoryInfo(b).label));
  const recordSummary = records.length === 200 ? 'Latest 200 records returned' : `${records.length} recent records returned`;

  return (
    <View style={styles.recentCoverage}>
      <View style={styles.recentCoverageCopy}>
        <Text style={styles.sectionEyebrow}>RECENT DATABASE COVERAGE</Text>
        <HeadingText level={2} style={styles.recentCoverageTitle}>Saved source records</HeadingText>
        {status === 'loading' ? (
          <Text style={styles.snapshotLine}>Loading recent Convex records…</Text>
        ) : status === 'error' ? (
          <Text style={styles.snapshotLine}>Recent database coverage is temporarily unavailable.</Text>
        ) : records.length === 0 ? (
          <Text style={styles.snapshotLine}>No recent offer records were returned.</Text>
        ) : (
          <>
            <Text style={styles.snapshotLine}>{recordSummary} · {chainNames.length} {chainNames.length === 1 ? 'chain' : 'chains'} · {categories.length} {categories.length === 1 ? 'category' : 'categories'}</Text>
            {chainNames.length > 0 ? <Text style={styles.snapshotLine}>{chainNames.join(' · ')}</Text> : null}
            {categories.length > 0 ? (
              <Text style={styles.snapshotLine}>{categories.map((category) => categoryInfo(category).label).join(' · ')}</Text>
            ) : null}
          </>
        )}
        <Text style={styles.coverageFootnote}>Earlier crawls help with source review; nearby comparisons use only the current crawl.</Text>
      </View>
      <LinkPressable
        href="/sources"
        accessibilityLabel="Browse recent source records"
        style={({ pressed }) => [styles.coverageLink, pressed && styles.pressed]}>
        <Text style={styles.coverageLinkText}>Browse sources</Text>
        <Text accessibilityElementsHidden style={styles.coverageLinkArrow}>→</Text>
      </LinkPressable>
    </View>
  );
}

function NearbyStores({ records }: { records: OfferRecord[] }) {
  return (
    <View style={styles.nearbySection}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>LIVE BOARD COVERAGE</Text>
          <HeadingText level={2} style={styles.nearbyTitle}>Nearby stores</HeadingText>
        </View>
        <Text style={styles.offerCount}>{records.length} {records.length === 1 ? 'location' : 'locations'}</Text>
      </View>
      <View style={styles.nearbyList}>
        {records.slice(0, 3).map((record, index) => (
          <View key={record.location.id} style={styles.nearbyRow}>
            <View style={styles.nearbyNumber}><Text style={styles.nearbyNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
            <View style={styles.nearbyCopy}>
              <Text style={styles.nearbyChain}>{record.chain.name}</Text>
              <Text numberOfLines={1} style={styles.nearbyAddress}>{record.location.store_name ?? record.location.address ?? 'Store name unavailable'}</Text>
            </View>
            <Text style={[styles.nearbyDistance, tabular]}>{record.distance_miles == null ? '—' : record.distance_miles.toFixed(1) + ' mi'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FilterMark() {
  return (
    <View style={styles.filterMark} accessibilityElementsHidden>
      <View style={styles.filterLineLong} />
      <View style={styles.filterLineMedium} />
      <View style={styles.filterLineShort} />
    </View>
  );
}

function matchesSearch(searchTerm: string, ...values: (string | null | undefined)[]) {
  if (!searchTerm) return true;
  const value = values.map((item) => item ?? '').join(' ').toLocaleLowerCase();
  return value.includes(searchTerm);
}

function sortRecords(records: OfferRecord[], sortBy: SortKey) {
  return [...records].sort((a, b) => compareRecords(a, b, sortBy));
}

function compareRecords(a: OfferRecord, b: OfferRecord, sortBy: SortKey) {
  const aPrice = a.offer.list_price_cents ?? Number.POSITIVE_INFINITY;
  const bPrice = b.offer.list_price_cents ?? Number.POSITIVE_INFINITY;
  const aUnit = unitPrice(a.offer) ?? Number.POSITIVE_INFINITY;
  const bUnit = unitPrice(b.offer) ?? Number.POSITIVE_INFINITY;
  const aDistance = a.distance_miles ?? Number.POSITIVE_INFINITY;
  const bDistance = b.distance_miles ?? Number.POSITIVE_INFINITY;
  const delta = sortBy === 'chain'
    ? a.chain.name.localeCompare(b.chain.name)
    : sortBy === 'total'
      ? aPrice - bPrice
      : sortBy === 'distance'
        ? aDistance - bDistance
        : aUnit - bUnit;
  return delta || a.chain.name.localeCompare(b.chain.name) || aPrice - bPrice;
}

function nearestStores(records: OfferRecord[]) {
  const locations = new Map<string, OfferRecord>();
  for (const record of records) {
    const current = locations.get(record.location.id);
    if (!current || (record.distance_miles ?? Number.POSITIVE_INFINITY) < (current.distance_miles ?? Number.POSITIVE_INFINITY)) {
      locations.set(record.location.id, record);
    }
  }
  return [...locations.values()].sort((a, b) =>
    (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY),
  );
}

function formatObservedAt(value: string | null) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatJobStatus(job: { status: string } | null) {
  if (!job) return 'No scrape job recorded';
  if (job.status === 'running') return 'Scrape running';
  if (job.status === 'succeeded') return 'Scrape completed';
  if (job.status === 'failed') return 'Scrape failed';
  return 'Scrape status: ' + job.status;
}

const styles = StyleSheet.create({
  screen: { width: '100%' },
  hero: {
    width: '100%',
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    gap: spacing.sm,
  },
  brand: { color: colors.black, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 21, lineHeight: 28, textAlign: 'center' },
  heroTitle: { alignSelf: 'center', maxWidth: 560, color: colors.black, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 36, lineHeight: 39, letterSpacing: -1.1, textAlign: 'center' },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  inner: { width: '100%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  searchBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.sm, borderWidth: 2, borderColor: colors.purple, borderRadius: 30, backgroundColor: colors.white },
  searchIcon: { width: 22, height: 22, justifyContent: 'center' },
  searchLens: { width: 14, height: 14, borderWidth: 2, borderColor: colors.purple, borderRadius: 8 },
  searchHandle: { position: 'absolute', width: 8, height: 2, right: 0, bottom: 2, backgroundColor: colors.purple, transform: [{ rotate: '48deg' }] },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: spacing.sm, color: colors.black, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  clearSearch: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  clearSearchText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 26, lineHeight: 30 },
  homeControls: { gap: spacing.sm },
  categoryGridHeading: { gap: spacing.xs },
  categoryGridTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.35 },
  categoryGridNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCard: { flexGrow: 1, flexBasis: '44%', minWidth: 144, minHeight: 84, justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.warmRule, backgroundColor: colors.lime },
  categoryCardSky: { backgroundColor: colors.sky },
  categoryCardWhite: { backgroundColor: colors.white },
  categoryCardSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  categoryCardTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 },
  categoryCardTitleSelected: { color: colors.white },
  categoryCardMeta: { color: colors.black, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  categoryCardMetaSelected: { color: colors.white },
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, letterSpacing: 0.7 },
  quickCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  categoryChipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  categoryChipText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  categoryChipTextSelected: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  categoryEmpty: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  locationBand: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  locationBandCompact: { minHeight: 54 },
  pinMark: { width: 18, height: 18, borderWidth: 2, borderColor: colors.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pinCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.purple },
  locationCopy: { flex: 1, minWidth: 0, gap: 1 },
  locationName: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  locationHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  changeLink: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  allHeader: { gap: spacing.sm },
  backButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs },
  backArrow: { color: colors.purple, fontFamily: fonts.regular, fontSize: 30, lineHeight: 34 },
  backText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  allTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  allTitleCopy: { flex: 1, minWidth: 0, gap: 3 },
  allTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 29, lineHeight: 34 },
  allSubtitle: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  filterButton: { minHeight: 48, minWidth: 94, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.black, borderRadius: 24, backgroundColor: colors.white },
  filterLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  filterMark: { width: 16, height: 14, justifyContent: 'space-between', alignItems: 'flex-start' },
  filterLineLong: { width: 15, height: 1.5, backgroundColor: colors.black },
  filterLineMedium: { width: 10, height: 1.5, backgroundColor: colors.black },
  filterLineShort: { width: 5, height: 1.5, backgroundColor: colors.black },
  sortSection: { gap: spacing.sm },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sortChip: { minHeight: 48, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  sortChipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  sortChipText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  sortChipTextSelected: { color: colors.white },
  filterPanel: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotCard: { padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotCardCompact: { paddingVertical: spacing.sm },
  snapshotCardFailed: { borderColor: colors.danger, backgroundColor: colors.paleDanger },
  snapshotTitleRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#36804B' },
  statusDotRunning: { backgroundColor: colors.warning },
  statusDotFailed: { backgroundColor: colors.danger },
  snapshotTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  snapshotCount: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  snapshotLine: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  snapshotError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  recentCoverage: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  recentCoverageCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  recentCoverageTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  coverageFootnote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  coverageLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  coverageLinkText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  coverageLinkArrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 17, lineHeight: 20 },
  featureSection: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  sectionEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, letterSpacing: 0.55 },
  sectionTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 25, lineHeight: 31 },
  offerCount: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  variantCaption: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  featureCards: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  seeAllButton: { minHeight: 58, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 30, backgroundColor: colors.yellow },
  seeAllText: { color: colors.black, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 18, lineHeight: 24 },
  seeAllArrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 22, lineHeight: 27 },
  nearbySection: { gap: spacing.sm },
  nearbyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25 },
  nearbyList: { paddingHorizontal: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: colors.warmRule, backgroundColor: colors.white },
  nearbyRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.warmRule },
  nearbyNumber: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 15, backgroundColor: colors.lime },
  nearbyNumberText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10 },
  nearbyCopy: { flex: 1, minWidth: 0, gap: 1 },
  nearbyChain: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  nearbyAddress: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  nearbyDistance: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  exclusionHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  listGuide: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  resultsGroup: { gap: spacing.sm },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.warmRule },
  groupTitle: { flex: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  groupCount: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11 },
  loadMoreButton: { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  loadMoreText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  loadMoreCount: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  excludedHost: { width: '100%' },
  excludedSummaryText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  inspectLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  inspectText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
