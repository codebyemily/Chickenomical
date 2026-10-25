import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, BackLink } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { useStoredOffersQuery, type OfferRecord } from '@/data/live-offers';
import { withStraightLineDistance } from '@/lib/distance';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

const RADII = [1, 3, 5, 10];
const VISIBLE_STORES = 5;

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Choose a saved distance',
  'Choose how far away a menu offer can be from your location.',
);

type NearbyStore = {
  id: string;
  brand: string;
  address: string | null;
  distance: number | null;
  offers: number;
  pricedOffers: number;
};

export default function LocationScreen() {
  const { radiusMiles, setRadiusMiles, searchSession } = usePrototype();
  const query = useStoredOffersQuery();
  const records = query.status === 'success' ? withStraightLineDistance(query.data, searchSession) : [];
  const stores = groupStores(records);
  const storesInRadius = stores.filter(({ distance }) => distance !== null && distance <= radiusMiles);
  const offersInRadius = records.filter(({ distance_miles }) => distance_miles !== null && distance_miles <= radiusMiles);
  const pricedCount = records.filter(({ offer }) => offer.list_price_cents !== null).length;
  const origin = searchSession?.address
    ?? (query.status === 'success' ? query.metadata.query.address?.trim() || 'Location not selected' : null);

  return (
    <AppFrame compact edgeToEdgeTop surface="compare">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <BackLink label="Back to Compare" tone="orange" />
          <HeadingText level={1} style={styles.heroTitle}>Set your distance.</HeadingText>
          <Text style={styles.heroDescription}>
            Choose how far a restaurant can be from your location.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.radiusCard}>
            <View style={styles.radiusHeading}>
              <View style={styles.radiusTitleCopy}>
                <HeadingText level={2} style={styles.sectionTitle}>Distance from your location</HeadingText>
              </View>
            </View>
            <Text style={styles.bodyCopy}>
              Compare starts here, then expands automatically when it needs more nearby restaurants to make a useful comparison.
            </Text>
            <View style={styles.radiusButtons}>
              {RADII.map((radius) => {
                const selected = radiusMiles === radius;
                return (
                  <Pressable
                    key={radius}
                    accessibilityRole="button"
                    accessibilityLabel={`${radius} miles`}
                    accessibilityState={{ selected }}
                    aria-pressed={selected}
                    onPress={() => setRadiusMiles(radius)}
                    style={({ pressed }) => [styles.radiusButton, selected && styles.radiusButtonSelected, pressed && styles.pressed]}>
                    <Text style={[styles.radiusButtonText, selected && styles.radiusButtonTextSelected]}>{radius} mi</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingCopy}>
              <HeadingText level={2} style={styles.sectionTitle}>Nearby restaurants</HeadingText>
            </View>
            {query.status === 'success' ? (
              <Text style={styles.sectionCount}>{stores.length} {stores.length === 1 ? 'store' : 'stores'}</Text>
            ) : null}
          </View>

          {query.status === 'loading' ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.purple} />
              <View style={styles.stateCopy}>
                <Text style={styles.stateTitle}>Loading nearby offers</Text>
                <Text style={styles.bodyCopy}>Checking the latest menu data.</Text>
              </View>
            </View>
          ) : null}

          {query.status === 'error' ? (
            <View style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>Couldn&apos;t load live locations</Text>
              <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.bodyCopy}>The live menu board is temporarily unavailable. Try again in a moment.</Text>
              <Text style={styles.errorHint}>Your selected distance is saved on this device.</Text>
            </View>
          ) : null}

          {query.status === 'success' ? (
            <>
              <View style={styles.snapshotCard}>
                <Text style={styles.origin}>{origin}</Text>
                <Text style={styles.snapshotSubline}>
                  {query.metadata.query.radius_miles != null
                    ? `${query.metadata.query.radius_miles} mi search`
                    : 'Distance not available'}
                  {' - '}{channelLabel(query.metadata.query.ordering_channel)}
                </Text>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, styles.statLime]}>
                    <Text style={styles.statValue}>{storesInRadius.length}</Text>
                    <Text style={styles.statLabel}>nearby stores</Text>
                  </View>
                  <View style={[styles.statCard, styles.statSky]}>
                    <Text style={styles.statValue}>{offersInRadius.length}</Text>
                    <Text style={styles.statLabel}>nearby offers</Text>
                  </View>
                  <View style={[styles.statCard, styles.statWhite]}>
                    <Text style={styles.statValue}>{pricedCount}</Text>
                    <Text style={styles.statLabel}>with prices</Text>
                  </View>
                </View>

                <Text style={styles.freshness}>
                  {query.metadata.observed_at
                    ? `Updated ${dateTimeLabel(query.metadata.observed_at)}`
                    : 'Update time unavailable'}
                </Text>
              </View>

              {stores.length === 0 ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>No nearby restaurants yet</Text>
                  <Text style={styles.bodyCopy}>
                    We found {query.data.length} menu offer{query.data.length === 1 ? '' : 's'}, but no restaurant locations. Try again after the next update.
                  </Text>
                </View>
              ) : (
                <View style={styles.storeList}>
                  <View style={styles.storeListHeading}>
                    <Text style={styles.listTitle}>Nearby restaurants</Text>
                    <Text style={styles.listMeta}>{storesInRadius.length} within {radiusMiles} mi</Text>
                  </View>
                  {stores.slice(0, VISIBLE_STORES).map((store) => {
                    const inRadius = store.distance !== null && store.distance <= radiusMiles;
                    return (
                      <View key={store.id} style={styles.storeRow}>
                        <View style={[styles.storeMarker, inRadius && styles.storeMarkerActive]}>
                          <Text style={[styles.storeMarkerText, inRadius && styles.storeMarkerTextActive]}>{store.brand.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.storeCopy}>
                          <Text numberOfLines={1} style={styles.storeName}>{store.brand}</Text>
                          <Text numberOfLines={1} style={styles.storeAddress}>{store.address || 'Address not returned'}</Text>
                          <Text style={styles.storeMeta}>{store.offers} offer{store.offers === 1 ? '' : 's'} - {store.pricedOffers} with prices</Text>
                        </View>
                        <Text style={[styles.distance, !inRadius && styles.distanceOutside]}>
                          {store.distance === null ? '—' : `${store.distance.toFixed(1)} mi`}
                        </Text>
                      </View>
                    );
                  })}
                  {stores.length > VISIBLE_STORES ? (
                    <Text style={styles.moreStores}>+ {stores.length - VISIBLE_STORES} more restaurant{stores.length - VISIBLE_STORES === 1 ? '' : 's'} in the comparison</Text>
                  ) : null}
                </View>
              )}

              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>Distance from your location</Text>
                <Text style={styles.noteText}>
                  Compare measures the distance from the place you enter, or from your current location, to each restaurant. This screen changes the distance used for that comparison.
                </Text>
              </View>
            </>
          ) : null}

          <BackButton label="Back to Compare" />
        </View>
      </View>
    </AppFrame>
  );
}

function groupStores(records: OfferRecord[]): NearbyStore[] {
  const stores = new Map<string, NearbyStore>();
  for (const { offer, location, chain, distance_miles } of records) {
    const existing = stores.get(location.id);
    if (existing) {
      existing.offers += 1;
      if (offer.list_price_cents !== null) existing.pricedOffers += 1;
      if (existing.distance === null && distance_miles !== null) existing.distance = distance_miles;
      continue;
    }
    const brand = brandName(chain.id, chain.name);
    stores.set(location.id, {
      id: location.id,
      brand,
      address: location.address,
      distance: distance_miles,
      offers: 1,
      pricedOffers: offer.list_price_cents === null ? 0 : 1,
    });
  }
  return [...stores.values()].sort((a, b) =>
    (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.brand.localeCompare(b.brand),
  );
}

function brandName(chainId: string, fallback: string) {
  const labels: Record<string, string> = {
    'raising-canes': "Raising Cane's",
    jollibee: 'Jollibee',
    wingstop: 'Wingstop',
    popeyes: 'Popeyes',
    wendys: "Wendy's",
    mcdonalds: "McDonald's",
    'chick-fil-a': 'Chick-fil-A',
    subway: 'Subway',
    kfc: 'KFC',
    'burger-king': 'Burger King',
  };
  return labels[chainId] ?? fallback;
}

function channelLabel(channel: string) {
  return channel.replaceAll('_', ' ');
}

function dateTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function BackButton({ label }: { label: string }) {
  if (Platform.OS !== 'web') return null;

  return (
    <LinkPressable href="/" replace style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Text style={styles.backButtonText}>{label}</Text>
      <Text style={styles.backArrow}>→</Text>
    </LinkPressable>
  );
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: 0 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: colors.orange,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  heroTitle: { maxWidth: 440, color: colors.black, fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  heroDescription: { maxWidth: 520, color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl },
  radiusCard: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white, borderColor: colors.warmRule, borderWidth: 1, borderRadius: radii.lg },
  radiusHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  radiusTitleCopy: { flex: 1, gap: spacing.xs },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.35 },
  bodyCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  radiusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  radiusButton: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.pill, backgroundColor: colors.cream },
  radiusButtonSelected: { borderColor: colors.purple, backgroundColor: colors.purple },
  radiusButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  radiusButtonTextSelected: { color: colors.white },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  sectionHeadingCopy: { gap: spacing.xs },
  sectionCount: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.3 },
  stateCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.md },
  stateCopy: { flex: 1, gap: spacing.xs },
  stateTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  errorCard: { flexDirection: 'column', alignItems: 'flex-start', borderColor: colors.danger, backgroundColor: colors.paleDanger },
  errorHint: { color: colors.warning, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  snapshotCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.warmRule },
  snapshotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  origin: { color: colors.black, fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4 },
  snapshotSubline: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statCard: { flex: 1, minWidth: 0, minHeight: 76, padding: spacing.sm, justifyContent: 'center', gap: spacing.xs, borderRadius: radii.md },
  statLime: { backgroundColor: colors.lime },
  statSky: { backgroundColor: colors.sky },
  statWhite: { backgroundColor: colors.white },
  statValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 22, lineHeight: 25, ...tabular },
  statLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  freshness: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  storeList: { gap: spacing.sm },
  storeListHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  listTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  listMeta: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15 },
  storeRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.md },
  storeMarker: { width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.sky },
  storeMarkerActive: { backgroundColor: colors.lime },
  storeMarkerText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  storeMarkerTextActive: { color: colors.black },
  storeCopy: { flex: 1, minWidth: 0, gap: 2 },
  storeName: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
  storeAddress: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  storeMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  distance: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, ...tabular },
  distanceOutside: { color: colors.muted },
  moreStores: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, paddingTop: spacing.xs },
  noteCard: { padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.sky, borderRadius: radii.md },
  noteTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  noteText: { color: colors.black, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  backButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.yellow },
  backButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  backArrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 22, lineHeight: 24 },
  pressed: { opacity: 0.72 },
});
