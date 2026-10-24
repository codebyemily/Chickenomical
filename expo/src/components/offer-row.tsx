import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DemoLocation, DemoOffer } from '@/data/demo';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { colors, fonts, spacing, tabular } from '@/theme';
import { ActionButton } from '@/components/ui/action-button';

type Props = {
  offer: DemoOffer;
  location: DemoLocation;
  distance: number;
  rank?: number;
  featured?: boolean;
};

export function OfferRow({ offer, location, distance, rank, featured = false }: Props) {
  const router = useRouter();
  const stale = offer.freshness === 'sample-stale';
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.nativeRow, featured && styles.nativeFeatured]}>
        <View style={styles.nativeTopline}>
          <View style={styles.titleStack}>
            <Text style={[styles.rank, featured && styles.featuredInk]}>
              {featured ? 'LOWEST SAMPLE PRICE PER PIECE' : `OFFER ${String(rank ?? 1).padStart(2, '0')}`}
            </Text>
            <Text style={[styles.nativeRestaurant, featured && styles.featuredInk]}>{location.chain}</Text>
            <Text style={[styles.location, featured && styles.featuredMuted]}>{location.displayName}</Text>
          </View>
          <View style={styles.nativeUnitBlock}>
            <Text style={[styles.nativeUnitPrice, featured && styles.featuredInk, tabular]}>{unitMoney(offer)}</Text>
            <Text style={[styles.unitLabel, featured && styles.featuredInk]}>PER PIECE</Text>
          </View>
        </View>
        <View style={[styles.separator, featured && styles.featuredSeparator]} />
        <Text style={[styles.nativeItem, featured && styles.featuredInk]}>
          {offer.itemName} · {offer.pieceCount == null ? 'Count not stated' : `${offer.pieceCount} pieces`}
        </Text>
        <Text style={[styles.nativeFacts, featured && styles.featuredInk, tabular]}>
          {money(offer.priceCents)} order total · {distance.toFixed(1)} mi straight-line sample
        </Text>
        <View style={styles.nativeProvenance}>
          <Text style={[styles.status, stale && styles.staleStatus, featured && styles.featuredInk]}>{freshnessText(offer)}</Text>
          <Text style={[styles.source, featured && styles.featuredMuted]}>
            {offer.sourceName} · {offer.sourceRecordId}
          </Text>
          <Text style={[styles.source, featured && styles.featuredMuted]}>
            {offer.channel} · checked {offer.mockChecked}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/offer/${offer.id}` as never)}
          style={({ pressed }) => [styles.nativeDetail, pressed && styles.pressed]}>
          <Text style={styles.nativeDetailText}>Offer details</Text>
          <Text style={styles.nativeDetailArrow}>›</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={[styles.row, featured && styles.featured]}>
      <View style={styles.topline}>
        <View style={styles.titleStack}>
          <Text style={[styles.rank, featured && styles.featuredInk]}>
            {featured ? 'LOWEST SAMPLE UNIT PRICE' : rank ? `OFFER ${String(rank).padStart(2, '0')}` : 'NEARBY OFFER'}
          </Text>
          <Text style={[styles.restaurant, featured && styles.featuredInk]}>{location.chain}</Text>
          <Text style={[styles.location, featured && styles.featuredMuted]}>{location.displayName}</Text>
        </View>
        <View style={styles.unitBlock}>
          <Text style={[styles.unitLabel, featured && styles.featuredInk]}>PER PIECE</Text>
          <Text style={[styles.unitPrice, featured && styles.featuredInk, tabular]}>{unitMoney(offer)}</Text>
        </View>
      </View>
      <View style={[styles.separator, featured && styles.featuredSeparator]} />
      <Text style={[styles.item, featured && styles.featuredInk]}>{offer.itemName}</Text>
      <View style={styles.facts}>
        <Fact label="COUNT" value={offer.pieceCount == null ? 'Not stated' : `${offer.pieceCount} pieces`} featured={featured} />
        <Fact label="ORDER TOTAL" value={money(offer.priceCents)} featured={featured} numeric />
        <Fact label="DISTANCE" value={`${distance.toFixed(1)} mi · straight-line sample`} featured={featured} numeric />
      </View>
      <View style={styles.provenance}>
        <View style={styles.provenanceText}>
          <Text style={[styles.status, stale && styles.staleStatus, featured && styles.featuredInk]}>{freshnessText(offer)}</Text>
          <Text style={[styles.source, featured && styles.featuredMuted]}>
            {offer.sourceName} · {offer.sourceRecordId}
          </Text>
          <Text style={[styles.source, featured && styles.featuredMuted]}>
            {offer.channel} · {offer.mockChecked}
          </Text>
        </View>
        <View style={styles.action}>
          <ActionButton
            kind={featured ? 'secondary' : 'secondary'}
            onPress={() => router.push(`/offer/${offer.id}` as never)}>
            Inspect offer
          </ActionButton>
        </View>
      </View>
    </View>
  );
}

function Fact({ label, value, featured, numeric = false }: { label: string; value: string; featured: boolean; numeric?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, featured && styles.featuredInk]}>{label}</Text>
      <Text style={[styles.factValue, featured && styles.featuredInk, numeric && tabular]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.black, padding: spacing.md, gap: spacing.md },
  featured: { backgroundColor: colors.yellow, borderColor: colors.black, borderWidth: 1, padding: spacing.lg },
  topline: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  titleStack: { flex: 1, gap: 3 },
  rank: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  location: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  unitBlock: { alignItems: 'flex-end', minWidth: 108 },
  unitLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  unitPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, ...tabular },
  separator: { height: 1, backgroundColor: colors.rule },
  featuredSeparator: { backgroundColor: colors.black, opacity: 0.45 },
  item: { color: colors.black, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { minWidth: 102, gap: 3, flexGrow: 1 },
  factLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  factValue: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  provenance: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  provenanceText: { flex: 1, minWidth: 220, gap: 3 },
  status: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.45 },
  staleStatus: { color: colors.warning },
  nativeRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.black, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  nativeFeatured: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, padding: spacing.md },
  nativeTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  nativeRestaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  nativeUnitBlock: { alignItems: 'flex-end', minWidth: 86 },
  nativeUnitPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, ...tabular },
  nativeItem: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  nativeFacts: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  nativeProvenance: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: spacing.sm, gap: 3 },
  nativeDetail: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: spacing.xs },
  nativeDetailText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  nativeDetailArrow: { color: colors.black, fontFamily: fonts.regular, fontSize: 24, lineHeight: 28 },
  pressed: { opacity: 0.64 },
  source: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  featuredInk: { color: colors.black },
  featuredMuted: { color: '#353535' },
  action: { minWidth: 132 },
});
