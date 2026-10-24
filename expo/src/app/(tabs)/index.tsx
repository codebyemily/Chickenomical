import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppFrame, PageHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { FilterSelect } from '@/components/filter-select';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { OfferRow } from '@/components/offer-row';
import { ActionButton } from '@/components/ui/action-button';
import { CompareStressControls, useCompareStress } from '@/dev/compare-stress';
import { freshnessText, distanceFor, locationsInRadius, money, rankedOffers, unitMoney, type SortMode } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing, tabular } from '@/theme';

const SORT_OPTIONS = [
  { value: 'unit', label: 'Lowest / piece' },
  { value: 'total', label: 'Lowest price' },
  { value: 'distance', label: 'Closest store' },
  { value: 'chain', label: 'Chain A–Z' },
];

export default function CompareScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { category, setCategory, sort, setSort, area, locationLabel, radiusMiles } = usePrototype();
  const stress = useCompareStress();
  const [query, setQuery] = useState('');
  const [chain, setChain] = useState('all');
  const [boardWidth, setBoardWidth] = useState(0);
  const wide = width >= 1100;
  const table = Platform.OS === 'web' && boardWidth >= 700;
  const nearby = locationsInRadius(area, radiusMiles, category, stress.locations);
  const allOffers = rankedOffers(nearby, category, 'unit', area);
  const best = allOffers[0];
  const normalizedQuery = query.toLowerCase().trim();
  const chains = [...new Set(nearby.map((location) => location.chain))].sort();
  const selectedChain = chains.includes(chain) ? chain : 'all';
  const matches = (itemName: string, chainName: string, storeName: string) =>
    (selectedChain === 'all' || chainName === selectedChain) &&
    (!normalizedQuery || (itemName + ' ' + chainName + ' ' + storeName).toLowerCase().includes(normalizedQuery));
  const offers = rankedOffers(nearby, category, sort, area)
    .filter(({ offer, location }) => matches(offer.itemName, location.chain, location.displayName));
  const excluded = nearby.flatMap((location) =>
    location.offers
      .filter((offer) => offer.category === category &&
        (offer.freshness === 'incomplete' || offer.freshness === 'unavailable') &&
        matches(offer.itemName, location.chain, location.displayName))
      .map((offer) => ({ location, offer })),
  );
  const maxStoreCount = Math.max(1, ...nearby.map((location) => allOffers.filter((row) => row.location.id === location.id).length));

  function resetFilters() {
    setQuery('');
    setChain('all');
  }

  return (
    <>
    <AppFrame active="Compare">
      <View>
        <PageHeading title="Nearby chicken, priced clearly." />

        <View style={[styles.locationStrip, width < 600 && styles.locationStripNarrow]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={'Change search origin, currently ' + locationLabel}
            onPress={() => router.push('/location' as never)}
            style={({ pressed }) => [styles.searchOrigin, width < 600 && styles.searchOriginNarrow, pressed && styles.pressed]}>
            <Text style={styles.label}>SEARCH ORIGIN</Text>
            <View style={styles.originLine}>
              <Text style={styles.locationName}>{locationLabel}</Text>
              <Text style={styles.changeLink}>Change ↗</Text>
            </View>
          </Pressable>
          <View style={styles.locationStat}>
            <Text style={styles.label}>RADIUS</Text>
            <Text style={[styles.locationValue, tabular]}>{radiusMiles} mi</Text>
          </View>
          <View style={styles.locationStat}>
            <Text style={styles.label}>CHANNEL</Text>
            <Text style={styles.locationValue}>Pickup</Text>
          </View>
        </View>

        <View style={[styles.signalGrid, wide && styles.signalGridWide]}>
          <LinkPressable
            href={best ? { pathname: '/offer/[id]', params: { id: stress.detailId(best.offer.id) } } : '/location'}
            accessibilityLabel={best
              ? 'Lowest sample price per piece: ' + unitMoney(best.offer) + '. ' + best.location.chain + ', ' + best.location.displayName + ', ' + best.offer.itemName + ', ' + money(best.offer.priceCents) + ' total. ' + freshnessText(best.offer) + '. ' + best.offer.mockChecked + '. View offer details.'
              : 'No comparable sample offers. Choose a search area.'}
            style={({ pressed }) => [styles.heroSignal, wide && styles.heroSignalWide, pressed && styles.pressed]}>
            <View style={styles.heroCopy}>
              <Text style={styles.label}>LOWEST SAMPLE PRICE / PIECE</Text>
              <Text selectable style={[styles.heroPrice, width >= 600 && styles.heroPriceWide, tabular]}>
                {best ? unitMoney(best.offer) : '—'}
              </Text>
              <Text style={styles.heroItem}>{best ? best.offer.itemName : 'No comparable sample offers'}</Text>
              <Text style={styles.heroMeta}>
                {best
                  ? best.location.chain + ' · ' + best.offer.pieceCount + ' pieces · ' + money(best.offer.priceCents) + ' total'
                  : 'Change the search area, radius, or chicken type.'}
              </Text>
              <Text style={styles.heroStatus}>{best ? best.offer.mockChecked + ' · synthetic' : 'Illustrative data only'}</Text>
            </View>
            <View style={styles.heroIndex}>
              <Text style={styles.heroIndexNumber}>{best ? '01' : '—'}</Text>
              <Text style={styles.heroIndexTotal}>OF {String(allOffers.length).padStart(2, '0')}</Text>
              <Text style={styles.heroArrow}>↗</Text>
            </View>
          </LinkPressable>
          <View style={[styles.metricStack, wide && styles.metricStackWide]}>
            <View style={styles.metric}>
              <Text style={styles.label}>RESTAURANTS</Text>
              <Text selectable style={[styles.metricNumber, tabular]}>{nearby.length}</Text>
              <Text style={styles.metricNote}>within the sample search area</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>PRICED OFFERS</Text>
              <Text selectable style={[styles.metricNumber, tabular]}>{allOffers.length}</Text>
              <Text style={styles.metricNote}>comparable {category} · synthetic</Text>
            </View>
          </View>
        </View>

        <View style={[styles.workspace, wide && styles.workspaceWide]}>
          <View style={styles.board} onLayout={(event) => setBoardWidth(event.nativeEvent.layout.width)}>
            <View style={[styles.boardHeading, boardWidth < 600 && styles.boardHeadingNarrow]}>
              <View style={styles.boardTitle}>
                <Text style={styles.label}>OFFER BOARD</Text>
                <HeadingText level={2} style={styles.sectionTitle}>Compare what’s available</HeadingText>
              </View>
              <View style={[styles.searchBox, boardWidth < 600 && styles.searchBoxNarrow]}>
                <FormField
                  label="Search offer or chain"
                  appearance="search"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search offer or chain"
                  submitLabel="search"
                />
              </View>
            </View>

            <View style={styles.filters}>
              <FilterSelect
                label="CHAIN"
                containerStyle={styles.selectFilter}
                labelStyle={styles.filterLabel}
                hostStyle={styles.pickerHost}
                value={selectedChain}
                onChange={setChain}
                options={[{ value: 'all', label: 'All chains' }, ...chains.map((value) => ({ value, label: value }))]}
              />
              <View style={styles.typeFilter}>
                <Text style={styles.filterLabel}>TYPE</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.typeButtons}>
                    <ActionButton width={92} selected={category === 'nuggets'} kind={category === 'nuggets' ? 'primary' : 'secondary'} onPress={() => setCategory('nuggets')}>Nuggets</ActionButton>
                    <ActionButton width={92} selected={category === 'tenders'} kind={category === 'tenders' ? 'primary' : 'secondary'} onPress={() => setCategory('tenders')}>Tenders</ActionButton>
                  </View>
                ) : (
                  <SegmentedControl
                    accessibilityLabel="Chicken type"
                    values={['Nuggets', 'Tenders']}
                    selectedIndex={category === 'nuggets' ? 0 : 1}
                    tintColor={colors.white}
                    onValueChange={(value) => setCategory(value === 'Tenders' ? 'tenders' : 'nuggets')}
                  />
                )}
              </View>
              <FilterSelect label="SORT" containerStyle={styles.selectFilter} labelStyle={styles.filterLabel} hostStyle={styles.pickerHost} value={sort} onChange={(value) => setSort(value as SortMode)} options={SORT_OPTIONS} />
              <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{offers.length} result{offers.length === 1 ? '' : 's'}</Text>
            </View>

            {table ? (
              <View style={styles.tableHeader}>
                <Text style={[styles.columnLabel, styles.offerColumn]}>OFFER</Text>
                <Text style={[styles.columnLabel, styles.chainColumn]}>CHAIN / STORE</Text>
                <Text style={[styles.columnLabel, styles.typeColumn]}>TYPE</Text>
                <Text style={[styles.columnLabel, styles.priceColumn]}>PRICE</Text>
                <Text style={[styles.columnLabel, styles.unitColumn]}>$/PIECE</Text>
              </View>
            ) : null}

            {offers.length ? offers.map((row, index) => (
              <OfferRow
                key={row.offer.id}
                {...row}
                offer={stress.rowOffer(row.offer)}
                rank={index + 1}
                featured={row.offer.id === best?.offer.id}
                table={table}
              />
            )) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{allOffers.length ? 'No priced offers match these filters.' : 'No comparable offers in this search area.'}</Text>
                <Text style={styles.emptyNote}>Only standalone pickup items with a stated count and usable price appear here.</Text>
                <ActionButton kind="secondary" onPress={allOffers.length ? resetFilters : () => router.push('/location' as never)}>
                  {allOffers.length ? 'Reset filters' : 'Change search area'}
                </ActionButton>
              </View>
            )}

            {excluded.length ? (
              <View style={styles.excludedSection}>
                <Text style={styles.filterLabel}>NOT IN THE COMPARISON</Text>
                {excluded.map(({ offer, location }) => (
                  <LinkPressable
                    key={offer.id}
                    href={{ pathname: '/offer/[id]', params: { id: stress.detailId(offer.id) } }}
                    style={({ pressed }) => [styles.excludedRow, pressed && styles.pressed]}>
                    <View style={styles.excludedCopy}>
                      <Text style={styles.excludedName}>{location.chain} · {offer.itemName}</Text>
                      <Text style={styles.excludedMeta}>{freshnessText(offer)}</Text>
                    </View>
                    <Text style={styles.inspectText}>Inspect ↗</Text>
                  </LinkPressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[styles.rail, wide && styles.railWide]}>
            <View style={styles.railHeading}>
              <Text style={styles.label}>FIELD NOTES</Text>
              <HeadingText level={2} style={styles.sectionTitle}>Store coverage</HeadingText>
            </View>
            <View style={styles.storeList}>
              {nearby.length ? nearby.map((location) => {
                const count = allOffers.filter((row) => row.location.id === location.id).length;
                return (
                  <View key={location.id} style={styles.store}>
                    <View style={styles.storeTop}>
                      <Text style={styles.storeName}>{location.chain}</Text>
                      <Text style={[styles.distance, tabular]}>{distanceFor(location, area).toFixed(1)} mi</Text>
                    </View>
                    <Text style={styles.storeAddress}>{location.displayName}</Text>
                    <Text style={styles.storeAddress}>{location.address}</Text>
                    <View style={styles.storeBar}><View style={[styles.storeBarFill, { width: (count / maxStoreCount * 100) + '%' as `${number}%` }]} /></View>
                    <View style={styles.storeFooter}>
                      <Text style={styles.storeFooterText}>{count} comparable offer{count === 1 ? '' : 's'}</Text>
                      <Text style={styles.storeFooterText}>PICKUP</Text>
                    </View>
                  </View>
                );
              }) : <Text style={styles.noStores}>No sample stores in this area. Choose another search origin.</Text>}
            </View>
            <View style={styles.methodNote}>
              <Text style={styles.label}>METHOD</Text>
              <Text style={styles.methodText}>Compare standalone pickup items within one chicken type. Yellow marks the lowest sample price per piece. Stale records carry a recheck label.</Text>
              <LinkPressable href="/methodology" style={({ pressed }) => [styles.methodAction, pressed && styles.pressed]}>
                <Text style={styles.methodLink}>Read comparison rules ↗</Text>
              </LinkPressable>
            </View>
          </View>
        </View>
      </View>
    </AppFrame>
    {stress.enabled ? <CompareStressControls mode={stress.mode} onChange={stress.setMode} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  locationStrip: { flexDirection: 'row', gap: spacing.xxxl, paddingTop: spacing.lg, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: colors.rule },
  locationStripNarrow: { flexWrap: 'wrap', gap: spacing.lg },
  searchOrigin: { flex: 1, gap: 5, minHeight: 44 },
  searchOriginNarrow: { flexBasis: '100%' },
  originLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.md },
  locationName: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  changeLink: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, textDecorationLine: 'underline' },
  locationStat: { minWidth: 90, gap: 5 },
  locationValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  pressed: { opacity: 0.7 },
  signalGrid: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: 30 },
  signalGridWide: { flexDirection: 'row' },
  heroSignal: { minHeight: 220, flexDirection: 'row', justifyContent: 'space-between', padding: 24, backgroundColor: colors.yellow, borderWidth: 2, borderColor: colors.black, gap: spacing.md },
  heroSignalWide: { flex: 2 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroPrice: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 64, lineHeight: 78, letterSpacing: -5, marginTop: spacing.sm, ...tabular },
  heroPriceWide: { fontSize: 96, lineHeight: 108, letterSpacing: -8 },
  heroItem: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, marginTop: spacing.sm },
  heroMeta: { color: colors.heroMuted, fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  heroStatus: { color: colors.heroMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  heroIndex: { alignItems: 'flex-end', gap: spacing.xs },
  heroIndexNumber: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 15 },
  heroIndexTotal: { color: colors.black, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  heroArrow: { color: colors.black, fontSize: 25, marginTop: 'auto' },
  metricStack: { flexDirection: 'row', gap: spacing.md },
  metricStackWide: { flex: 1, flexDirection: 'column' },
  metric: { flex: 1, justifyContent: 'center', gap: spacing.sm, padding: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  metricNumber: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 42, lineHeight: 48, ...tabular },
  metricNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  workspace: { gap: spacing.md, alignItems: 'stretch' },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  board: { flex: 2.1, minWidth: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  boardHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.rule, gap: spacing.lg },
  boardHeadingNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  boardTitle: { gap: 7, flexShrink: 1 },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.8 },
  searchBox: { width: 210 },
  searchBoxNarrow: { width: '100%' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: spacing.lg, rowGap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, backgroundColor: colors.gray, borderBottomWidth: 1, borderBottomColor: colors.rule },
  selectFilter: { flex: 1, minWidth: 130, gap: spacing.xs },
  filterLabel: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.4 },
  pickerHost: { width: '100%', minHeight: 36 },
  typeFilter: { flex: 1.3, minWidth: 190, gap: spacing.xs },
  typeButtons: { flexDirection: 'row', gap: spacing.xs },
  resultCount: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 18, paddingBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: spacing.xl, gap: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.black },
  columnLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
  offerColumn: { flex: 3.2 },
  chainColumn: { flex: 2.2 },
  typeColumn: { flex: 1.2 },
  priceColumn: { flex: 1, minWidth: 68 },
  unitColumn: { flex: 1, minWidth: 60 },
  empty: { padding: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  emptyNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  excludedSection: { backgroundColor: colors.gray, padding: spacing.lg, gap: spacing.md },
  excludedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  excludedCopy: { flex: 1, gap: 4 },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
  inspectText: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, lineHeight: 16 },
  rail: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  railWide: { flex: 0.9, minWidth: 280 },
  railHeading: { padding: spacing.xl, gap: 7, borderBottomWidth: 1, borderBottomColor: colors.rule },
  storeList: { paddingHorizontal: spacing.xl },
  store: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.rule },
  storeTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  storeName: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  distance: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 18 },
  storeAddress: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  storeBar: { height: 5, marginTop: spacing.md, backgroundColor: colors.gray },
  storeBarFill: { height: '100%', backgroundColor: colors.black },
  storeFooter: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs, marginTop: 7 },
  storeFooterText: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 17 },
  noStores: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, paddingVertical: spacing.xl },
  methodNote: { margin: spacing.xl, padding: spacing.lg, backgroundColor: colors.gray, gap: spacing.sm },
  methodText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  methodAction: { minHeight: 48, justifyContent: 'center' },
  methodLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, lineHeight: 18, textDecorationLine: 'underline' },
});
