import { useRouter } from 'expo-router';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { OfferRow } from '@/components/offer-row';
import { ActionButton } from '@/components/ui/action-button';
import { DEMO_LOCATIONS } from '@/data/demo';
import { freshnessText, locationsInRadius, rankedOffers } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing } from '@/theme';

const CATEGORIES = [
  { id: 'nuggets', label: 'Nuggets' },
  { id: 'tenders', label: 'Tenders' },
] as const;

const SORTS = [
  { id: 'unit', label: 'Price per piece' },
  { id: 'total', label: 'Order total' },
  { id: 'distance', label: 'Distance' },
] as const;

export default function CompareScreen() {
  const router = useRouter();
  const { category, setCategory, sort, setSort, area, locationLabel, radiusMiles } = usePrototype();
  const nearby = locationsInRadius(area, radiusMiles, category);
  const offers = rankedOffers(nearby, category, sort, area);
  const best = offers[0];
  const excluded = nearby.flatMap((location) =>
    location.offers
      .filter((offer) => offer.category === category && (offer.freshness === 'incomplete' || offer.freshness === 'unavailable'))
      .map((offer) => ({ location, offer })),
  );

  return (
    <AppFrame active="Compare">
      <PageHeading
        title={Platform.OS === 'web' ? 'Find a better price per piece.' : 'Nearby chicken prices'}
        description={Platform.OS === 'web' ? 'Compare pickup portions by the number of pieces, total order price, and straight-line distance.' : undefined}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/location' as never)}
        style={({ pressed }) => [styles.locationBand, Platform.OS !== 'web' && styles.locationBandNative, pressed && styles.pressed]}>
        <View style={styles.locationCopy}>
          <Text style={styles.controlLabel}>{Platform.OS === 'web' ? `SEARCH AREA · ${radiusMiles} MI RADIUS` : `SEARCH AREA · ${radiusMiles} MI`}</Text>
          <Text style={styles.locationName}>{locationLabel}</Text>
          {Platform.OS === 'web' ? <Text style={styles.locationHint}>Distances are straight-line sample values</Text> : null}
        </View>
        <Text style={styles.changeLink}>{Platform.OS === 'web' ? 'Change area' : 'Change'}</Text>
      </Pressable>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          {Platform.OS === 'web' ? <Text style={styles.controlLabel}>CHICKEN TYPE</Text> : null}
          {Platform.OS === 'web' ? (
            <View style={styles.buttonRow}>
              {CATEGORIES.map((item) => (
                <ActionButton key={item.id} kind={category === item.id ? 'primary' : 'secondary'} onPress={() => setCategory(item.id)}>
                  {item.label}
                </ActionButton>
              ))}
            </View>
          ) : (
            <SegmentedControl
              accessibilityLabel="Chicken type"
              values={['Nuggets', 'Tenders']}
              selectedIndex={category === 'nuggets' ? 0 : 1}
              tintColor={colors.black}
              onValueChange={(value) => setCategory(value === 'Tenders' ? 'tenders' : 'nuggets')}
            />
          )}
        </View>
        <View style={styles.filterGroup}>
          {Platform.OS === 'web' ? <Text style={styles.controlLabel}>SORT RESULTS</Text> : <Text style={styles.sortLabel}>Sort by</Text>}
          {Platform.OS === 'web' ? (
            <View style={styles.buttonRow}>
              {SORTS.map((item) => (
                <ActionButton key={item.id} kind={sort === item.id ? 'primary' : 'secondary'} onPress={() => setSort(item.id)}>
                  {item.label}
                </ActionButton>
              ))}
            </View>
          ) : (
            <SegmentedControl
              accessibilityLabel="Sort offers"
              values={['Per piece', 'Total', 'Distance']}
              selectedIndex={sort === 'unit' ? 0 : sort === 'total' ? 1 : 2}
              tintColor={colors.black}
              onValueChange={(value) => setSort(value === 'Total' ? 'total' : value === 'Distance' ? 'distance' : 'unit')}
            />
          )}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <SectionHeading title={`${category === 'nuggets' ? 'Nugget' : 'Tender'} offers`} trailing={Platform.OS === 'web' ? 'SYNTHETIC DEMO RANKING' : undefined} />
        <Text style={styles.resultsMeta}>
          {offers.length} comparable sample {offers.length === 1 ? 'offer' : 'offers'} within {radiusMiles} miles
        </Text>
      </View>

      {best ? (
        <View style={styles.offerList}>
          <OfferRow
            offer={best.offer}
            location={best.location}
            distance={best.distance}
            featured
          />
          {offers.slice(1).map((row, index) => (
            <OfferRow
              key={row.offer.id}
              offer={row.offer}
              location={row.location}
              distance={row.distance}
              rank={index + 2}
            />
          ))}
        </View>
      ) : (
        <NoticeBand title="No comparable offers in this sample" tone="warning">
          Try a larger radius, another demo area, or the other chicken category. Offers without an explicit count or available pickup price stay out of the ranking.
        </NoticeBand>
      )}

      {excluded.length > 0 ? (
        <View style={styles.excludedSection}>
          <SectionHeading title="Nearby, not ranked" trailing="INCOMPLETE OR UNAVAILABLE" />
          <Text style={styles.excludedIntro}>
            These prototype rows are shown for transparency. Missing counts and unavailable prices cannot be compared per piece.
          </Text>
          {excluded.map(({ offer, location }) => (
            <View key={offer.id} style={styles.excludedRow}>
              <View style={styles.excludedCopy}>
                <Text style={styles.excludedName}>{location.chain} · {offer.itemName}</Text>
                <Text style={styles.excludedMeta}>{freshnessText(offer)} · {offer.sourceRecordId}</Text>
              </View>
              <Pressable onPress={() => router.push(`/offer/${offer.id}` as never)} accessibilityRole="link">
                <Text style={styles.inspectText}>Inspect</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <View style={styles.quantityCallout}>
          <View style={styles.quantityText}>
            <Text style={styles.quantityTitle}>Buying for a group?</Text>
            <Text style={styles.quantityDescription}>Find the least expensive order combination for a piece target.</Text>
          </View>
          <View style={styles.quantityAction}>
            <ActionButton kind="secondary" onPress={() => router.push('/quantity' as never)}>
              Set a piece goal
            </ActionButton>
          </View>
        </View>
      ) : null}

      <HardRule />
      <View style={styles.proofNote}>
        <Text style={styles.proofTitle}>What the ranking uses</Text>
        <Text style={styles.proofText}>
          Standalone pickup items with a stated piece count. Tenders and nuggets stay separate. Sample prices are compared mathematically but are not restaurant menu claims.
        </Text>
        <Text style={styles.proofText}>Demo area contains {DEMO_LOCATIONS.length} fictional store records.</Text>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  locationBand: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  locationBandNative: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  locationCopy: { gap: 3, flex: 1 },
  controlLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.9 },
  locationName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 23 },
  locationHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  changeLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, textDecorationLine: 'underline' },
  pressed: { opacity: 0.76 },
  filters: { gap: spacing.md },
  filterGroup: { gap: spacing.xs },
  buttonRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  sortLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  quantityCallout: { backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.black, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  quantityText: { flex: 1, gap: 3 },
  quantityTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16 },
  quantityDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  quantityAction: { minWidth: 152 },
  resultsHeader: { gap: spacing.sm },
  resultsMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  offerList: { gap: spacing.sm },
  excludedSection: { gap: spacing.md },
  excludedIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  excludedRow: { backgroundColor: colors.white, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  excludedCopy: { gap: 4, flex: 1 },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.35 },
  inspectText: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, textDecorationLine: 'underline' },
  proofNote: { gap: spacing.xs },
  proofTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  proofText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
});
