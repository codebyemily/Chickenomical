import { useRouter } from 'expo-router';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { OfferRow } from '@/components/offer-row';
import { ActionButton } from '@/components/ui/action-button';
import { DEMO_LOCATIONS } from '@/data/demo';
import { freshnessText, locationsInRadius, rankedOffers } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

const CATEGORIES = [
  { id: 'nuggets', label: 'Nuggets' },
  { id: 'tenders', label: 'Tenders' },
] as const;

const SORTS = [
  { id: 'unit', label: 'Per peck' },
  { id: 'total', label: 'Total scratch' },
  { id: 'distance', label: 'Crow-flies' },
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
        title="Don't chicken out on price per peck."
        description="Find a good value on nuggets or tenders, then check the scratch, portion, and chicken scratch. Birds of a feather rank together."
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/location' as never)}
        style={({ pressed }) => [styles.locationBand, Platform.OS !== 'web' && styles.locationBandNative, pressed && styles.pressed]}>
        <View style={styles.locationCopy}>
          <Text style={styles.controlLabel}>{`COOP RADIUS · ${radiusMiles} MI`}</Text>
          <Text style={styles.locationName}>{locationLabel}</Text>
          <Text style={styles.locationHint}>Distances are as-the-crow-flies sample estimates. Why did the chicken cross the road? A cheaper coop.</Text>
        </View>
        <Text style={styles.changeLink}>Change roost</Text>
      </Pressable>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.controlLabel}>FLOCK CUT</Text>
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
              accessibilityLabel="Flock cut"
              values={['Nuggets', 'Tenders']}
              selectedIndex={category === 'nuggets' ? 0 : 1}
              tintColor={colors.white}
              onValueChange={(value) => setCategory(value === 'Tenders' ? 'tenders' : 'nuggets')}
            />
          )}
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.controlLabel}>PECKING ORDER</Text>
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
              accessibilityLabel="Pecking order"
              values={['Per peck', 'Scratch', 'Crow-flies']}
              selectedIndex={sort === 'unit' ? 0 : sort === 'total' ? 1 : 2}
              tintColor={colors.white}
              onValueChange={(value) => setSort(value === 'Scratch' ? 'total' : value === 'Crow-flies' ? 'distance' : 'unit')}
            />
          )}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <SectionHeading title={`${category === 'nuggets' ? 'Nugget' : 'Tender'} pecking order`} trailing="SYNTHETIC FLOCK RANKING" />
        <Text style={styles.resultsMeta}>
          {offers.length} comparable sample {offers.length === 1 ? 'bird' : 'birds'} inside a {radiusMiles}-mile coop.
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
        <NoticeBand title="Nothing to crow about in this sample" tone="warning">
          Stretch the coop radius, try another demo roost, or switch flock cuts. Offers without a stated count or pickup price stay out of the pecking order. Don&apos;t count these chickens.
        </NoticeBand>
      )}

      {excluded.length > 0 ? (
        <View style={styles.excludedSection}>
          <SectionHeading title="Nearby, not in the pecking order" trailing="SCRATCHED FROM THE RANKING" />
          <Text style={styles.excludedIntro}>
            These rows flew the coop of the ranking. Missing counts and unavailable prices cannot be compared per peck.
          </Text>
          {excluded.map(({ offer, location }) => (
            <View key={offer.id} style={styles.excludedRow}>
              <View style={styles.excludedCopy}>
                <Text style={styles.excludedName}>{location.chain} · {offer.itemName}</Text>
                <Text style={styles.excludedMeta}>{freshnessText(offer)} · {offer.sourceRecordId}</Text>
              </View>
              <Pressable onPress={() => router.push(`/offer/${offer.id}` as never)} accessibilityRole="link">
                <Text style={styles.inspectText}>Chick it out</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <View style={styles.quantityCallout}>
          <View style={styles.quantityText}>
            <Text style={styles.quantityTitle}>Feeding a flock?</Text>
            <Text style={styles.quantityDescription}>Hatch the cheapest order combo for a piece target. Don&apos;t put all your eggs in one basket unless it&apos;s cheaper.</Text>
          </View>
          <View style={styles.quantityAction}>
            <ActionButton kind="secondary" onPress={() => router.push('/quantity' as never)}>
              Hatch a piece goal
            </ActionButton>
          </View>
        </View>
      ) : null}

      <HardRule />
      <View style={styles.proofNote}>
        <Text style={styles.proofTitle}>What this pecking order uses</Text>
        <Text style={styles.proofText}>
          Only standalone pickup items with a stated piece count are ranked. Tenders and nuggets never flock together. All displayed prices are synthetic. That&apos;s no yolk.
        </Text>
        <Text style={styles.proofText}>This coop holds {DEMO_LOCATIONS.length} fictional roosts. Cheap as chicken feed, and just as made-up.</Text>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  locationBand: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
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
  quantityCallout: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  quantityText: { flex: 1, gap: 3 },
  quantityTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16 },
  quantityDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  quantityAction: { minWidth: 152 },
  resultsHeader: { gap: spacing.sm },
  resultsMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  offerList: { gap: spacing.sm },
  excludedSection: { gap: spacing.md },
  excludedIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  excludedRow: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  excludedCopy: { gap: 4, flex: 1 },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.35 },
  inspectText: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, textDecorationLine: 'underline' },
  proofNote: { gap: spacing.xs },
  proofTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  proofText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
});
