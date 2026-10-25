import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, PageHeading } from '@/components/app-frame';
import { useLiveOffersQuery, type OfferRecord } from '@/data/live-offers';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

const RADII = [1, 3, 5, 10];
const VISIBLE_STORES = 5;

type NearbyStore = {
  id: string;
  name: string;
  address: string | null;
  distance: number | null;
  offers: number;
  pricedOffers: number;
};

export default function LocationScreen() {
  const router = useRouter();
  const { radiusMiles, setRadiusMiles } = usePrototype();
  const query = useLiveOffersQuery();
  const stores = query.status === 'success' ? groupStores(query.data) : [];
  const storesInRadius = stores.filter(({ distance }) => distance !== null && distance <= radiusMiles);
  const offersInRadius = query.status === 'success'
    ? query.data.filter(({ distance_miles }) => distance_miles !== null && distance_miles <= radiusMiles)
    : [];
  const pricedCount = query.status === 'success'
    ? query.data.filter(({ offer }) => offer.list_price_cents !== null).length
    : 0;
  const origin = query.status === 'success'
    ? query.metadata.query.address?.trim() || 'Origin not recorded'
    : null;

  return (
    <AppFrame compact surface="compare">
      <View style={styles.screen}>
        <PageHeading title="Chickenomical" compact navOnly />

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>NEARBY / LIVE CRAWL</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>Set your distance.</Text>
          <Text style={styles.heroDescription}>
            Choose how far away a saved menu offer can be to appear in Compare.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.radiusCard}>
            <View style={styles.radiusHeading}>
              <View style={styles.radiusTitleCopy}>
                <Text style={styles.eyebrow}>COMPARE FILTER</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Maximum saved distance</Text>
              </View>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{radiusMiles} MI</Text>
              </View>
            </View>
            <Text style={styles.bodyCopy}>
              This updates Compare using each offer&apos;s recorded crawl distance. Offers without a saved distance stay out of nearby results.
            </Text>
            <View style={styles.radiusButtons}>
              {RADII.map((radius) => {
                const selected = radiusMiles === radius;
                return (
                  <Pressable
                    key={radius}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
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
              <Text style={styles.eyebrow}>CONVEX / CURRENT BOARD</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Live locations</Text>
            </View>
            {query.status === 'success' ? (
              <Text style={styles.sectionCount}>{stores.length} STORE{stores.length === 1 ? '' : 'S'}</Text>
            ) : null}
          </View>

          {query.status === 'loading' ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.purple} />
              <View style={styles.stateCopy}>
                <Text style={styles.stateTitle}>Loading the latest crawl</Text>
                <Text style={styles.bodyCopy}>Connecting to the Convex offers board.</Text>
              </View>
            </View>
          ) : null}

          {query.status === 'error' ? (
            <View style={[styles.stateCard, styles.errorCard]}>
              <Text style={styles.stateTitle}>Couldn&apos;t load live locations</Text>
              <Text style={styles.bodyCopy} numberOfLines={3}>{query.error.message || 'The Convex offers board is unavailable right now.'}</Text>
              <Text style={styles.errorHint}>Your selected distance is still saved for this app session.</Text>
            </View>
          ) : null}

          {query.status === 'success' ? (
            <>
              <View style={styles.snapshotCard}>
                <View style={styles.snapshotHeader}>
                  <Text style={styles.eyebrow}>SCRAPE ORIGIN</Text>
                  <View style={[styles.jobBadge, query.metadata.job?.status === 'succeeded' && styles.jobBadgeComplete]}>
                    <Text style={styles.jobBadgeText}>{query.metadata.job?.status ?? 'NO JOB'}</Text>
                  </View>
                </View>
                <Text style={styles.origin}>{origin}</Text>
                <Text style={styles.snapshotSubline}>
                  {query.metadata.query.radius_miles != null
                    ? `${query.metadata.query.radius_miles} mi crawl`
                    : 'Crawl radius not recorded'}
                  {' · '}{channelLabel(query.metadata.query.ordering_channel)}
                </Text>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, styles.statLime]}>
                    <Text style={styles.statValue}>{storesInRadius.length}</Text>
                    <Text style={styles.statLabel}>stores in filter</Text>
                  </View>
                  <View style={[styles.statCard, styles.statSky]}>
                    <Text style={styles.statValue}>{offersInRadius.length}</Text>
                    <Text style={styles.statLabel}>offers in filter</Text>
                  </View>
                  <View style={[styles.statCard, styles.statWhite]}>
                    <Text style={styles.statValue}>{pricedCount}</Text>
                    <Text style={styles.statLabel}>priced offers</Text>
                  </View>
                </View>

                <Text style={styles.freshness}>
                  {query.metadata.observed_at
                    ? `Latest offer observed ${dateTimeLabel(query.metadata.observed_at)}`
                    : 'No offer timestamp returned'}
                </Text>
              </View>

              {stores.length === 0 ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>No stores in this Convex board yet</Text>
                  <Text style={styles.bodyCopy}>
                    The board returned {query.data.length} menu offer{query.data.length === 1 ? '' : 's'} and no location records. The location list will appear when a crawl includes stores.
                  </Text>
                </View>
              ) : (
                <View style={styles.storeList}>
                  <View style={styles.storeListHeading}>
                    <Text style={styles.listTitle}>Stores in the crawl</Text>
                    <Text style={styles.listMeta}>{storesInRadius.length} within {radiusMiles} mi</Text>
                  </View>
                  {stores.slice(0, VISIBLE_STORES).map((store) => {
                    const inRadius = store.distance !== null && store.distance <= radiusMiles;
                    return (
                      <View key={store.id} style={styles.storeRow}>
                        <View style={[styles.storeMarker, inRadius && styles.storeMarkerActive]}>
                          <Text style={[styles.storeMarkerText, inRadius && styles.storeMarkerTextActive]}>{store.name.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.storeCopy}>
                          <Text numberOfLines={1} style={styles.storeName}>{store.name}</Text>
                          <Text numberOfLines={1} style={styles.storeAddress}>{store.address || 'Address not returned'}</Text>
                          <Text style={styles.storeMeta}>{store.offers} offer{store.offers === 1 ? '' : 's'} · {store.pricedOffers} priced</Text>
                        </View>
                        <Text style={[styles.distance, !inRadius && styles.distanceOutside]}>
                          {store.distance === null ? '—' : `${store.distance.toFixed(1)} mi`}
                        </Text>
                      </View>
                    );
                  })}
                  {stores.length > VISIBLE_STORES ? (
                    <Text style={styles.moreStores}>+ {stores.length - VISIBLE_STORES} more store{stores.length - VISIBLE_STORES === 1 ? '' : 's'} in the live board</Text>
                  ) : null}
                </View>
              )}

              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>Saved crawl distances</Text>
                <Text style={styles.noteText}>
                  The displayed radius filters existing Convex records. It does not request device location, recalculate distance from an address, or start a new scrape.
                </Text>
              </View>
            </>
          ) : null}

          <BackButton onPress={() => router.dismissTo('/')} label="Back to comparison" />
        </View>
      </View>
    </AppFrame>
  );
}

function groupStores(records: OfferRecord[]): NearbyStore[] {
  const stores = new Map<string, NearbyStore>();
  for (const { offer, location, distance_miles } of records) {
    const existing = stores.get(location.id);
    if (existing) {
      existing.offers += 1;
      if (offer.list_price_cents !== null) existing.pricedOffers += 1;
      if (existing.distance === null && distance_miles !== null) existing.distance = distance_miles;
      continue;
    }
    stores.set(location.id, {
      id: location.id,
      name: location.store_name?.trim() || location.id,
      address: location.address,
      distance: distance_miles,
      offers: 1,
      pricedOffers: offer.list_price_cents === null ? 0 : 1,
    });
  }
  return [...stores.values()].sort((a, b) =>
    (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name),
  );
}

function channelLabel(channel: string) {
  return channel.replaceAll('_', ' ');
}

function dateTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function BackButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Text style={styles.backButtonText}>{label}</Text>
      <Text style={styles.backArrow}>→</Text>
    </Pressable>
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
  heroEyebrow: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },
  heroTitle: { maxWidth: 440, color: colors.black, fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  heroDescription: { maxWidth: 520, color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl },
  radiusCard: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white, borderColor: colors.warmRule, borderWidth: 1, borderRadius: radii.lg },
  radiusHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  radiusTitleCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5 },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.35 },
  currentBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.purpleSoft },
  currentBadgeText: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16 },
  bodyCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  radiusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  radiusButton: { minHeight: 42, minWidth: 62, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.pill, backgroundColor: colors.cream },
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
  jobBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.paleWarning },
  jobBadgeComplete: { backgroundColor: colors.lime },
  jobBadgeText: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 13, letterSpacing: 0.3, textTransform: 'uppercase' },
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
  backButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.coral },
  backButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  backArrow: { color: colors.white, fontFamily: fonts.bold, fontSize: 22, lineHeight: 24 },
  pressed: { opacity: 0.72 },
});
