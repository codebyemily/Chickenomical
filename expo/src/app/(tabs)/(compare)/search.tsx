import { useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppFrame, BackLink, NoticeBand } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { CompareOfferCard, FeaturedOfferCard } from '@/components/compare-offer-card';
import { NearbyMap } from '@/components/nearby-map';
import { CategoryPicker } from '@/components/category-picker';
import { FormField } from '@/components/form-field';
import { LinkPressable } from '@/components/link-pressable';
import { QueryStatePanel } from '@/components/query-state-panel';
import { useStoredOffersQuery, type OfferRecord } from '@/data/live-offers';
import { startNearbyScrape } from '@/data/nearby-scrape';
import { categoryInfo } from '@/data/menu-schema';
import { exclusionText, isRankable, unitPrice } from '@/lib/compare';
import { decorative } from '@/lib/a11y';
import { isValidLatLng, matchesMood, moodCategory, placeKey, resolveDeviceCity, resolvePlace, shortPlace, withStraightLineDistance, type LatLng } from '@/lib/distance';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { usePrototype } from '@/state/prototype-context';
import { pageMetadata } from '@/data/page-metadata';
import { colors, curve, fonts, ripple, spacing } from '@/theme';
import type { GenerateMetadataFunction } from 'expo-router/server';

type Screen = 'home' | 'all';
type SortKey = 'unit' | 'total' | 'distance' | 'chain';
const COMPARISON_PAGE_SIZE = 24;
const MIN_NEARBY_STORES = 5;

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Compare chicken menu prices',
  'Compare recent chicken menu prices, pack sizes, nearby locations, and the sources behind each offer.',
);

export default function CompareScreen() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[]; mood?: string | string[]; browse?: string | string[] }>();
  const { category, setCategory, radiusMiles, searchSession, setSearchSession } = usePrototype();
  const viewParam = firstParam(params.view);
  const moodParam = firstParam(params.mood);
  const wantsAll = firstParam(params.browse) === 'all' && moodParam.length === 0;
  const screen: Screen = viewParam === 'all' || pathname === '/all' ? 'all' : 'home';
  const initialMood = moodParam || (wantsAll ? '' : searchSession?.mood ?? '');
  const [mood, setMood] = useState(initialMood);
  const [browseAll] = useState(wantsAll || initialMood.length === 0);
  const [place, setPlace] = useState(searchSession?.address ?? '');
  const [devicePoint, setDevicePoint] = useState<LatLng | null>(searchSession?.originType === 'device'
    ? { latitude: searchSession.latitude, longitude: searchSession.longitude }
    : null);
  const [placeEdited, setPlaceEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(searchSession?.originType !== 'place');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('unit');
  const [selectedChainId, setSelectedChainId] = useState('all');
  const [visiblePage, setVisiblePage] = useState({ key: '', count: COMPARISON_PAGE_SIZE });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const query = useStoredOffersQuery(searchSession?.scrapeJobId);
  const placeEditedRef = useRef(false);
  const moodRef = useRef(mood);
  const placeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const originPoint = searchSession
    ? { latitude: searchSession.latitude, longitude: searchSession.longitude }
    : null;
  const measured = query.status === 'success' ? withStraightLineDistance(query.data, originPoint) : [];
  const searchRadiusMiles = expandRadiusToMinimumStores(measured, radiusMiles, MIN_NEARBY_STORES);
  const inRadius = measured.filter(({ distance_miles }) => distance_miles != null && distance_miles <= searchRadiusMiles);
  const categoryOptions = [...new Set(inRadius.flatMap(({ offer }) => offer.category ? [offer.category] : []))]
    .sort((a, b) => categoryInfo(a).label.localeCompare(categoryInfo(b).label));
  const moodMatch = moodCategory(mood);
  const activeCategory = moodMatch ?? (categoryOptions.includes(category) ? category : categoryOptions[0]);
  useEffect(() => {
    if (moodMatch && moodMatch !== category) setCategory(moodMatch);
  }, [category, moodMatch, setCategory]);
  const chainOptions = Array.from(
    new Map(inRadius.map(({ chain }) => [chain.id, chain.name] as const)),
    ([id, name]) => ({ id, name }),
  )
    .sort((a, b) => a.name.localeCompare(b.name));
  const normalizedSearch = mood.trim().toLocaleLowerCase();
  const comparisonPageKey = JSON.stringify([normalizedSearch, searchRadiusMiles, selectedChainId, sortBy, searchSession?.key]);
  const foodNamed = normalizedSearch.length > 0;
  const showPicks = foodNamed || browseAll;
  const visibleComparisonCount = visiblePage.key === comparisonPageKey ? visiblePage.count : COMPARISON_PAGE_SIZE;
  const matchingRecords = query.status === 'success'
    ? inRadius
      .filter((record) => matchesMood(record, mood))
      .filter(({ chain }) => selectedChainId === 'all' || chain.id === selectedChainId)
    : [];
  const comparable = matchingRecords.filter(({ offer }) => isRankable(offer));
  const excluded = matchingRecords.filter(({ offer }) => !isRankable(offer));
  const ranked = sortRecords(comparable, sortBy);
  const visibleOffers = ranked.slice(0, visibleComparisonCount);
  const remainingOfferCount = ranked.length - visibleOffers.length;
  const nextPageSize = Math.min(COMPARISON_PAGE_SIZE, remainingOfferCount);
  const bestValue = [...comparable].sort((a, b) =>
    unitPrice(a.offer)! - unitPrice(b.offer)! ||
    a.offer.list_price_cents! - b.offer.list_price_cents! ||
    (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY),
  )[0];
  const lowestTotal = [...comparable].sort((a, b) =>
    a.offer.list_price_cents! - b.offer.list_price_cents! ||
    unitPrice(a.offer)! - unitPrice(b.offer)! ||
    (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY),
  )[0];
  const origin = searchSession?.address || 'Choose a place';
  const chainCount = new Set(comparable.map(({ chain }) => chain.id)).size;
  const categoryDetails = activeCategory
    ? categoryInfo(activeCategory)
    : { label: mood.trim() || 'chicken', unit: 'item', plural: 'items' };
  const sortValues = ['$/' + categoryDetails.unit, 'Total', 'Distance', 'Chain A–Z'];
  const sortOptions = [
    { id: 'total', label: 'Total' },
    { id: 'unit', label: sortValues[0] },
    { id: 'distance', label: 'Distance' },
    { id: 'chain', label: sortValues[3] },
  ] as { id: SortKey; label: string }[];
  const resultColumns = Platform.OS !== 'web' && width >= 360 ? 2 : width < 720 ? 1 : 2;
  const resultFrame = Math.min(width, 1360);
  const resultCardWidth = (resultFrame - spacing.lg * 2 - spacing.sm * (resultColumns - 1)) / resultColumns;

  function rememberOrigin(origin: LatLng & { label: string }, originType: 'device' | 'place', scrapeJobId?: string) {
    const key = placeKey(origin, radiusMiles);
    const sameSearch = searchSession?.key === key;
    setSearchSession({
      key,
      mood: moodRef.current.trim(),
      address: origin.label,
      latitude: origin.latitude,
      longitude: origin.longitude,
      originType,
      radiusMiles,
      cached: sameSearch,
      browseAll: moodRef.current.trim().length === 0,
      scrapeJobId: scrapeJobId ?? (sameSearch ? searchSession?.scrapeJobId : undefined),
    });
    setPlace(origin.label);
    if (originType === 'device') setDevicePoint({ latitude: origin.latitude, longitude: origin.longitude });
    placeEditedRef.current = false;
    setPlaceEdited(false);
  }

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'all' || !filtersOpen) return false;
      setFiltersOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [filtersOpen, screen]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    if (!searchSession) return;
    const nextBrowse = mood.trim().length === 0;
    if (searchSession.mood === mood && searchSession.browseAll === nextBrowse) return;
    setSearchSession({ ...searchSession, mood, browseAll: nextBrowse });
  }, [mood, searchSession, setSearchSession]);

  useEffect(() => {
    let cancelled = false;
    const hadSession = searchSession != null;
    const shouldUseAsOrigin = searchSession?.originType !== 'place';
    void (async () => {
      try {
        const point = await readDeviceOrigin();
        if (cancelled) return;
        setDevicePoint({ latitude: point.latitude, longitude: point.longitude });
        if (!placeEditedRef.current && shouldUseAsOrigin) rememberOrigin(point, 'device');
      } catch (error) {
        if (!cancelled && !hadSession) setSearchError(error instanceof Error ? error.message : 'Location is unavailable. Type an address instead.');
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => { cancelled = true; };
    // Opening /search starts from the device location. A later place edit is kept.
    // The search route refreshes the device origin whenever navigation brings it back into focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function submitSearch() {
    const address = place.trim();
    const useDevice = devicePoint != null && !placeEdited;
    if (!useDevice && address.length < 2) {
      setSearchError('Add a place, or use your current location.');
      return;
    }
    setSubmitting(true);
    setSearchError(null);
    try {
      const origin = useDevice
        ? { latitude: devicePoint.latitude, longitude: devicePoint.longitude, label: address || `${devicePoint.latitude.toFixed(4)}, ${devicePoint.longitude.toFixed(4)}` }
        : await resolvePlace(address);
      const originType = useDevice ? 'device' : 'place';
      rememberOrigin(origin, originType);
      const job = await startNearbyScrape({
        address: origin.label,
        latitude: origin.latitude,
        longitude: origin.longitude,
        radiusMiles,
      });
      rememberOrigin(origin, originType, job.jobId);
    } catch (error) {
      setSearchError(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function locateDevice() {
    setLocating(true);
    setSearchError(null);
    try {
      const origin = await readDeviceOrigin();
      rememberOrigin(origin, 'device');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Location is unavailable. Type an address instead.');
    } finally {
      setLocating(false);
    }
  }

  const placeSearch = (
    <View style={styles.somewhereElse}>
      {screen === 'home' ? (
        <HeadingText level={2} style={styles.sectionTitle}>Need to search somewhere else?</HeadingText>
      ) : null}
      <View style={styles.placeRow}>
        <FormField
          inputRef={placeRef}
          label="Place"
          value={place}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          onChangeText={(value) => {
            placeEditedRef.current = true;
            setPlace(value);
            setPlaceEdited(true);
          }}
          placeholder="San Francisco, CA"
          submitLabel="search"
          onSubmitEditing={() => { void submitSearch(); }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          disabled={locating || submitting}
          android_ripple={ripple}
          onPress={() => { void locateDevice(); }}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed, (locating || submitting) && styles.disabled]}>
          <Text style={styles.locationButtonText}>{locating ? 'Finding…' : 'Use my location'}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare nearby chicken"
        disabled={submitting || locating}
        android_ripple={ripple}
        onPress={() => { void submitSearch(); }}
        style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed, (submitting || locating) && styles.disabled]}>
        <Text style={styles.seeAllText}>{submitting ? 'Starting nearby search…' : 'Compare'}</Text>
      </Pressable>
      {searchError ? <Text accessibilityRole="alert" style={styles.snapshotError}>{searchError}</Text> : null}
      <LocationBand origin={shortPlace(origin)} radiusMiles={searchRadiusMiles} />
    </View>
  );

  return (
    <AppFrame active="Compare" compact edgeToEdgeTop surface="compare">
      <View style={styles.screen}>
        {screen === 'home' ? (
          <View style={[styles.hero, { paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.sm }]}>
            <BackLink label="Pick something else" tone="orange" />
            <HeadingText level={1} style={styles.heroTitle}>Here&apos;s what&apos;s cheapest nearby</HeadingText>
          </View>
        ) : null}

        {screen === 'all' ? (
          <View style={[styles.allHeader, Platform.OS !== 'web' && styles.allHero]}>
            {Platform.OS === 'web' ? (
              <LinkPressable
                href={'/search' as never}
                accessibilityLabel="Back to the cheapest nearby"
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <Text style={styles.backArrow}>‹</Text>
                <Text style={styles.backText}>Compare</Text>
              </LinkPressable>
            ) : <BackLink label="Compare" tone="orange" />}
            <View style={styles.allTitleRow}>
              <View style={styles.allTitleCopy}>
                <HeadingText level={1} style={[styles.allTitle, Platform.OS !== 'web' && styles.allTitleNative]}>All comparisons</HeadingText>
                <Text style={[styles.allSubtitle, Platform.OS !== 'web' && styles.allSubtitleNative]}>
                  {comparable.length} results across {chainCount} {chainCount === 1 ? 'restaurant' : 'restaurants'} - {shortPlace(origin)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={filtersOpen ? 'Done' : 'Filter'}
                accessibilityState={{ expanded: filtersOpen }}
                aria-expanded={filtersOpen}
                android_ripple={ripple}
                onPress={() => setFiltersOpen((value) => !value)}
                style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
                <FilterMark />
                <Text style={styles.filterLabel}>{filtersOpen ? 'Done' : 'Filter'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.inner}>
          {locating ? (
            <View accessibilityRole="progressbar" style={styles.centeredLoading}>
              <ActivityIndicator color={colors.purple} size="large" />
              <Text style={styles.centeredLoadingText}>Finding your location…</Text>
            </View>
          ) : (
            <>
          {screen === 'all' ? (
            <>
              <SearchField value={mood} onChangeText={setMood} onSubmitEditing={() => placeRef.current?.focus()} />
              <View style={styles.quickCategories}>
                {MOOD_CHOICES.map((choice) => {
                  const selected = mood.trim().toLocaleLowerCase() === choice.toLocaleLowerCase();
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityLabel={choice}
                      accessibilityState={{ selected }}
                      aria-pressed={selected}
                      android_ripple={ripple}
                      onPress={() => setMood(choice)}
                      style={({ pressed }) => [styles.categoryChip, selected && styles.categoryChipSelected, pressed && styles.pressed]}>
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{choice}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          {screen === 'all' ? placeSearch : null}

          {screen === 'all' ? (
            <>
              <View style={styles.sortSection}>
                {Platform.OS !== 'web' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptionsScroll}>
                    <View style={styles.sortOptionsNative}>
                      {sortOptions.map((option) => (
                        <SortChip
                          key={option.id}
                          option={option}
                          selected={sortBy === option.id}
                          onPress={() => setSortBy(option.id)}
                        />
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.sortOptions}>
                    {sortOptions.map((option) => (
                      <SortChip
                        key={option.id}
                        option={option}
                        selected={sortBy === option.id}
                        onPress={() => setSortBy(option.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
              {filtersOpen ? (
                <View style={styles.filterPanel}>
                  <CategoryPicker value={activeCategory ?? category} onChange={(value) => {
                    setCategory(value);
                    setMood(categoryInfo(value).label);
                  }} categories={categoryOptions} />
                  <View style={styles.quickCategories}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="All chains"
                      accessibilityState={{ selected: selectedChainId === 'all' }}
                      aria-pressed={selectedChainId === 'all'}
                      android_ripple={ripple}
                      onPress={() => setSelectedChainId('all')}
                      style={({ pressed }) => [styles.categoryChip, selectedChainId === 'all' && styles.categoryChipSelected, pressed && styles.pressed]}>
                      <Text style={[styles.categoryChipText, selectedChainId === 'all' && styles.categoryChipTextSelected]}>All chains</Text>
                    </Pressable>
                    {chainOptions.map((chain) => (
                      <Pressable
                        key={chain.id}
                        accessibilityRole="button"
                        accessibilityLabel={chain.name}
                        accessibilityState={{ selected: selectedChainId === chain.id }}
                        aria-pressed={selectedChainId === chain.id}
                        android_ripple={ripple}
                        onPress={() => setSelectedChainId(chain.id)}
                        style={({ pressed }) => [styles.categoryChip, selectedChainId === chain.id && styles.categoryChipSelected, pressed && styles.pressed]}>
                        <Text style={[styles.categoryChipText, selectedChainId === chain.id && styles.categoryChipTextSelected]}>{chain.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <LocationBand origin={origin} radiusMiles={searchRadiusMiles} compact />
                </View>
              ) : null}
            </>
          ) : null}

          {query.status === 'error' ? <QueryStatePanel status="error" /> : null}
          {searchSession && query.status === 'loading' ? <QueryStatePanel status="loading" /> : null}
          {query.status === 'success' && searchSession?.scrapeJobId && query.metadata.job?._id === searchSession.scrapeJobId && query.metadata.job.status === 'running' ? (
            <NoticeBand title="Checking nearby menus" tone="warning">
              Your current prices stay visible while the latest nearby scrape runs. New results will appear here automatically.
            </NoticeBand>
          ) : null}
          {query.status === 'success' && searchSession?.scrapeJobId && query.metadata.job?._id === searchSession.scrapeJobId && query.metadata.job.status === 'failed' ? (
            <NoticeBand title="Nearby search could not finish" tone="error">
              {query.metadata.job.error || 'The scrape failed. Try Compare again in a moment.'}
            </NoticeBand>
          ) : null}

          {query.status === 'success' && screen === 'home' && searchSession && showPicks ? (
            <>
              <View style={styles.sectionHeading}>
                <HeadingText level={2} style={styles.sectionTitle}>
                  {`Quality value ${categoryDetails.label.toLocaleLowerCase()} in ${shortPlace(origin)}`}
                </HeadingText>
              </View>
              {bestValue && lowestTotal ? (
                <View style={styles.featureCards}>
                  {([
                    { record: bestValue, kind: 'unit' as const },
                    { record: lowestTotal, kind: 'total' as const },
                  ]).map((pick) => (
                    <View key={pick.kind} style={{ width: resultCardWidth }}>
                      <FeaturedOfferCard record={pick.record} jobId={query.metadata.job?._id} kind={pick.kind} compact={resultColumns === 2 && Platform.OS !== 'web'} />
                    </View>
                  ))}
                </View>
              ) : (
                <NoticeBand title="No comparable prices in this area yet" tone="warning">
                  {query.metadata.job?.status === 'running'
                    ? 'The current menu update is still running. Picks show up when a verified price is available nearby.'
                    : query.metadata.job?.status === 'failed'
                      ? 'The latest menu update failed. Try Compare again to start another search.'
                    : matchingRecords.length > 0
                      ? 'Restaurants nearby have this food, but none has a verified pickup price and pack count.'
                      : nearestStores(inRadius).length === 0
                        ? 'No nearby restaurant locations are available for this search yet.'
                        : `We found nearby restaurants, but none has a ${mood.trim().toLocaleLowerCase() || 'chicken'} price yet.`}
                </NoticeBand>
              )}

              <LinkPressable
                accessibilityLabel={'See more, ' + comparable.length + ' comparisons'}
                href={'/all' as never}
                style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}>
                <Text style={styles.seeAllText}>See more ({comparable.length})</Text>
                <Text {...decorative} style={styles.seeAllArrow}>→</Text>
              </LinkPressable>
            </>
          ) : null}
          {screen === 'home' && originPoint && showPicks ? (
            <NearbyMap
              origin={originPoint}
              userLocation={devicePoint}
              radiusMiles={searchRadiusMiles}
              places={nearestStores(inRadius).flatMap((record) => {
                if (record.location.latitude == null || record.location.longitude == null) return [];
                const placeName = record.location.store_name ?? record.chain.name;
                return [{
                  id: record.location.id,
                  latitude: record.location.latitude,
                  longitude: record.location.longitude,
                  label: `${placeName}, ${record.distance_miles?.toFixed(1) ?? 'unknown'} miles`,
                }];
              })}
            />
          ) : null}
          {screen === 'home' ? placeSearch : null}

          {query.status === 'success' && screen === 'all' && showPicks ? (
            <>
              <Text style={styles.listGuide}>{comparable.length} results across {chainCount} {chainCount === 1 ? 'restaurant' : 'restaurants'}.</Text>
              {visibleOffers.length > 0 ? visibleOffers.map((record, index) => (
                <CompareOfferCard
                  key={record.offer.id}
                  record={record}
                  jobId={query.metadata.job?._id}
                  rank={index + 1}
                  tone={record.offer.id === bestValue?.offer.id ? 'lime' : record.offer.id === lowestTotal?.offer.id ? 'sky' : 'plain'}
                  primaryMetric={sortBy === 'chain' ? 'unit' : sortBy === 'distance' ? 'distance' : sortBy}
                />
              )) : (
                <NoticeBand title="No matching pickup prices" tone="warning">
                  {normalizedSearch
                    ? 'Try a shorter search or clear the search field.'
                    : matchingRecords.length === 0
                      ? 'There are no nearby offers for this category yet.'
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
                </Pressable>
              ) : null}

              {excluded.length > 0 ? (
                <View style={styles.excludedHost}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${showExcluded ? 'Hide' : 'Show'} ${excluded.length} offers not compared`}
                    accessibilityState={{ expanded: showExcluded }}
                    aria-expanded={showExcluded}
                    onPress={() => setShowExcluded((value) => !value)}
                    style={({ pressed }) => [styles.excludedSummary, pressed && styles.pressed]}>
                    <Text style={styles.excludedSummaryText}>Not compared - {excluded.length}</Text>
                    <Text style={styles.excludedArrow}>{showExcluded ? '⌃' : '›'}</Text>
                  </Pressable>
                  {showExcluded ? (
                    <View style={styles.excludedList}>
                      {excluded.map((record) => (
                        <View key={record.offer.id} style={styles.excludedRow}>
                          <View style={styles.excludedCopy}>
                        <Text numberOfLines={1} style={styles.excludedName}>{record.chain.name + ' - ' + record.offer.original_name}</Text>
                            <Text numberOfLines={2} style={styles.excludedMeta}>{exclusionText(record.offer)}</Text>
                          </View>
                            <LinkPressable href={offerDetailRoute(record.offer.id) as never} style={styles.inspectLink}>
                            <Text style={styles.inspectText}>View offer</Text>
                          </LinkPressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}

          {screen === 'home' ? (
            <LinkPressable
              href="/methodology"
              accessibilityLabel="Learn more about how Chickenomical calculates comparisons"
              style={({ pressed }) => [styles.methodologyLink, pressed && styles.pressed]}>
              <MethodologyMark />
              <Text style={styles.methodologyLinkText}>Learn more about how we calculate things</Text>
              <Text {...decorative} style={styles.methodologyLinkArrow}>→</Text>
            </LinkPressable>
          ) : null}
            </>
          )}
        </View>
      </View>
    </AppFrame>
  );
}

const MOOD_CHOICES = ['Wings', 'Tenders', 'Nuggets', 'Buckets'];

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function SortChip({ option, selected, onPress }: { option: { id: SortKey; label: string }; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${option.label}`}
      android_ripple={ripple}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.sortChip, Platform.OS !== 'web' && styles.sortChipNative, selected && styles.sortChipSelected, pressed && styles.pressed]}>
      <Text style={[styles.sortChipText, selected && styles.sortChipTextSelected]}>{option.label}</Text>
    </Pressable>
  );
}

function SearchField({ value, onChangeText, onSubmitEditing }: { value: string; onChangeText: (value: string) => void; onSubmitEditing: () => void }) {
  return (
    <View style={styles.searchBox}>
      {value.length > 0 ? <SearchMark /> : null}
      <FormField
        label="Search menu offers"
        labelHidden
        value={value}
        onChangeText={onChangeText}
        submitLabel="next"
        blurOnSubmit={false}
        autoComplete="off"
        textContentType="none"
        onSubmitEditing={onSubmitEditing}
        appearance="search"
      />
      {value.length === 0 ? (
        <View {...decorative} pointerEvents="none" style={styles.searchPlaceholderGroup}>
          <SearchMark />
          <Text style={styles.searchPlaceholderText}>Search menu offers</Text>
        </View>
      ) : null}
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" android_ripple={ripple} onPress={() => onChangeText('')} style={styles.clearSearch}>
          <Text style={styles.clearSearchText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SearchMark() {
  return (
    <View {...decorative} style={styles.searchIcon}>
      <View style={styles.searchLens} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function LocationBand({ origin, radiusMiles, compact = false }: { origin: string; radiusMiles: number; compact?: boolean }) {
  return (
    <LinkPressable
      href="/location"
      accessibilityLabel={'Search area: ' + origin + '. Distance: ' + radiusMiles + ' miles. Change the distance.'}
      android_ripple={ripple}
      style={({ pressed }) => [styles.locationBand, compact && styles.locationBandCompact, pressed && styles.pressed]}>
      <View {...decorative} style={styles.pinMark}><View style={styles.pinCenter} /></View>
      <View style={styles.locationCopy}>
        <Text numberOfLines={1} style={styles.locationName}>{origin}</Text>
        <Text style={styles.locationHint}>{radiusMiles} mi away</Text>
      </View>
      <Text style={styles.changeLink}>Change</Text>
    </LinkPressable>
  );
}


function FilterMark() {
  return (
    <View {...decorative} style={styles.filterMark}>
      <View style={styles.filterLineLong} />
      <View style={styles.filterLineMedium} />
      <View style={styles.filterLineShort} />
    </View>
  );
}

function MethodologyMark() {
  return (
    <View {...decorative} style={styles.methodologyMark}>
      <View style={styles.methodologyBookBack} />
      <View style={styles.methodologyBookFront}>
        <View style={styles.methodologyBookRule} />
        <View style={styles.methodologyBookRuleShort} />
      </View>
    </View>
  );
}

function errorText(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error && typeof error.data === 'string') return error.data;
  if (error instanceof Error) return error.message;
  return 'The comparison could not start.';
}

async function readDeviceLocation(): Promise<LatLng> {
  if (Platform.OS === 'web') {
    const geolocation = globalThis.navigator?.geolocation;
    if (!geolocation) throw new Error('This browser cannot share a location. Type an address instead.');
    return new Promise((resolve, reject) => {
      geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => reject(new Error('Location permission was denied. Type an address instead.')),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      );
    });
  }
  try {
    const Location = await import('expo-location');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Location permission was denied. Type an address instead.');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    if (!isValidLatLng(point)) throw new Error('Current location is outside the supported map area. Type an address instead.');
    return point;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Location permission')) throw error;
    if (error instanceof Error && error.message.startsWith('Current location is outside')) throw error;
    throw new Error('Current location is unavailable in this build. Type an address instead.');
  }
}

async function readDeviceOrigin(): Promise<LatLng & { label: string }> {
  const point = await readDeviceLocation();
  const city = await resolveDeviceCity();
  return {
    ...point,
    label: city ?? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`,
  };
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

function expandRadiusToMinimumStores(records: OfferRecord[], baseRadiusMiles: number, minimumStores: number) {
  const distances = nearestStores(records)
    .map((record) => record.distance_miles)
    .filter((distance): distance is number => distance != null && Number.isFinite(distance))
    .sort((a, b) => a - b);
  if (distances.length === 0) return baseRadiusMiles;
  const targetDistance = distances[Math.min(minimumStores, distances.length) - 1];
  return Math.max(baseRadiusMiles, Math.ceil(targetDistance * 10) / 10);
}

const styles = StyleSheet.create({
  screen: { width: '100%' },
  hero: {
    width: '100%',
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    gap: spacing.sm,
  },
  heroTitle: { alignSelf: 'center', maxWidth: 560, color: colors.black, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 36, lineHeight: 50, letterSpacing: -0.2, textAlign: 'center' },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  inner: { width: '100%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  centeredLoading: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centeredLoadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  searchBox: { minHeight: 54, position: 'relative', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.sm, borderWidth: 2, borderColor: colors.purple, borderRadius: 30, borderCurve: curve, backgroundColor: colors.white },
  searchIcon: { width: 22, height: 22, justifyContent: 'center' },
  searchLens: { width: 14, height: 14, borderWidth: 2, borderColor: colors.purple, borderRadius: 8 },
  searchHandle: { position: 'absolute', width: 8, height: 2, right: 0, bottom: 2, backgroundColor: colors.purple, transform: [{ rotate: '48deg' }] },
  searchPlaceholderGroup: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  searchPlaceholderText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
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
  quickCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, borderCurve: curve, backgroundColor: colors.white },
  categoryChipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  categoryChipText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  categoryChipTextSelected: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  categoryEmpty: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  locationBand: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, borderCurve: curve, backgroundColor: colors.white },
  locationBandCompact: { minHeight: 54 },
  pinMark: { width: 18, height: 18, borderWidth: 2, borderColor: colors.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pinCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.purple },
  locationCopy: { flex: 1, minWidth: 0, gap: 1 },
  locationName: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  locationHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  changeLink: { color: colors.purple, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  allHeader: { gap: spacing.sm },
  allHero: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.orange, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  backButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs },
  backArrow: { color: colors.purple, fontFamily: fonts.regular, fontSize: 30, lineHeight: 34 },
  backText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  allTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  allTitleCopy: { flex: 1, minWidth: 0, gap: 3 },
  allTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 29, lineHeight: 34 },
  allTitleNative: { color: colors.black },
  allSubtitleNative: { color: colors.black },
  allSubtitle: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  filterButton: { minHeight: 48, minWidth: 94, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.black, borderRadius: 24, backgroundColor: colors.white },
  filterLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  filterMark: { width: 16, height: 14, justifyContent: 'space-between', alignItems: 'flex-start' },
  filterLineLong: { width: 15, height: 1.5, backgroundColor: colors.black },
  filterLineMedium: { width: 10, height: 1.5, backgroundColor: colors.black },
  filterLineShort: { width: 5, height: 1.5, backgroundColor: colors.black },
  sortSection: { gap: spacing.sm },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sortOptionsScroll: { paddingRight: spacing.sm },
  sortOptionsNative: { flexDirection: 'row', gap: spacing.sm },
  sortChip: { minHeight: 48, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, backgroundColor: colors.white },
  sortChipNative: { flex: 0, minWidth: 82 },
  sortChipSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  sortChipText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  sortChipTextSelected: { color: colors.white },
  filterPanel: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotCard: { padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 18, backgroundColor: colors.white },
  snapshotCardCompact: { paddingVertical: spacing.sm },
  snapshotCardFailed: { borderColor: colors.danger, backgroundColor: colors.paleDanger },
  snapshotTitleRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.statusGreen },
  statusDotRunning: { backgroundColor: colors.warning },
  statusDotFailed: { backgroundColor: colors.danger },
  snapshotTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  snapshotCount: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  snapshotLine: { color: colors.black, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
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
  sectionTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 25, lineHeight: 31 },
  offerCount: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  variantCaption: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  featureCards: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center', gap: spacing.sm },
  somewhereElse: { gap: spacing.md },
  placeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  locationButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 24, borderCurve: curve, backgroundColor: colors.purple },
  locationButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  disabled: { opacity: 0.55 },
  seeAllButton: { minHeight: 58, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 30, borderCurve: curve, backgroundColor: colors.yellow },
  seeAllText: { color: colors.black, fontFamily: fonts.bold, fontStyle: 'italic', fontSize: 18, lineHeight: 24 },
  seeAllArrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 22, lineHeight: 27 },
  methodologyLink: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 1, borderTopColor: colors.warmRule },
  methodologyMark: { width: 28, height: 28, justifyContent: 'center', alignItems: 'flex-end' },
  methodologyBookBack: { position: 'absolute', width: 18, height: 22, left: 2, top: 3, borderRadius: 3, backgroundColor: colors.purpleSoft },
  methodologyBookFront: { width: 20, height: 24, justifyContent: 'center', gap: 3, paddingHorizontal: 4, borderRadius: 3, backgroundColor: colors.purple },
  methodologyBookRule: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.white },
  methodologyBookRuleShort: { width: 8, height: 2, borderRadius: 1, backgroundColor: colors.white },
  methodologyLinkText: { flex: 1, color: colors.purple, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  methodologyLinkArrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 22, lineHeight: 26 },
  nearbySection: { gap: spacing.sm },
  nearbyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25 },
  nearbyList: { paddingHorizontal: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: colors.warmRule, backgroundColor: colors.white },
  nearbyRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.warmRule },
  nearbyNumber: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 15, backgroundColor: colors.lime },
  nearbyNumberText: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
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
  excludedHost: { width: '100%', gap: spacing.xs },
  excludedSummary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, borderTopWidth: 1, borderTopColor: colors.warmRule },
  excludedSummaryText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  excludedArrow: { color: colors.black, fontFamily: fonts.regular, fontSize: 26, lineHeight: 30 },
  excludedList: { gap: spacing.xs, paddingTop: spacing.xs },
  excludedRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm, borderTopWidth: 1, borderTopColor: colors.warmRule },
  excludedCopy: { flex: 1, minWidth: 0, gap: 2 },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  inspectLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  inspectText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
