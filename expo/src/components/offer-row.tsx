import { StyleSheet, Text, View } from 'react-native';

import { LinkPressable } from '@/components/link-pressable';
import type { DemoLocation, DemoOffer } from '@/data/demo';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { colors, fonts, spacing, tabular } from '@/theme';

type Props = {
  offer: DemoOffer;
  location: DemoLocation;
  distance: number;
  rank?: number;
  featured?: boolean;
  table?: boolean;
};

export function OfferRow({ offer, location, distance, featured = false, table = false }: Props) {
  const stale = offer.freshness === 'sample-stale';
  const accessibleLabel = [
    location.chain,
    location.displayName,
    offer.itemName,
    offer.pieceCount == null ? null : offer.pieceCount + ' pieces',
    money(offer.priceCents) + ' total',
    unitMoney(offer) + ' per piece',
    distance.toFixed(1) + ' miles away',
    freshnessText(offer),
    offer.mockChecked,
    'Source record ' + offer.sourceRecordId,
    'Synthetic sample data',
    featured ? 'Lowest sample price per piece' : null,
    'View offer details',
  ].filter(Boolean).join('. ');

  return (
    <LinkPressable
      href={{ pathname: '/offer/[id]', params: { id: offer.id } }}
      accessibilityLabel={accessibleLabel}
      style={({ pressed }) => [
        styles.row,
        table && styles.tableRow,
        featured && styles.bestRow,
        pressed && styles.pressed,
      ]}>
      {table ? (
        <>
          <View style={styles.offerColumn}>
            <View style={styles.nameLine}>
              <Text style={styles.offerName}>{offer.itemName}</Text>
              {featured ? <Text style={styles.bestTag}>LOWEST / PC</Text> : null}
            </View>
            <Text style={[styles.offerSub, stale && styles.stale]}>{freshnessText(offer)}</Text>
          </View>
          <View style={styles.chainColumn}>
            <Text style={styles.chainName}>{location.chain}</Text>
            <Text style={styles.storeName}>{location.displayName} · {distance.toFixed(1)} mi</Text>
          </View>
          <View style={styles.typeColumn}>
            <Text style={styles.typeChip}>{offer.category === 'nuggets' ? 'Nuggets' : 'Tenders'}</Text>
          </View>
          <View style={styles.priceColumn}>
            <Text selectable style={[styles.price, tabular]}>{money(offer.priceCents)}</Text>
          </View>
          <View style={styles.unitColumn}>
            <Text selectable style={[styles.unit, tabular]}>{unitMoney(offer)}</Text>
            <Text style={styles.perPiece}>/ pc</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.mobileTop}>
            <Text style={styles.chainName}>{location.chain}</Text>
            <Text style={[styles.distance, tabular]}>{distance.toFixed(1)} mi</Text>
          </View>
          <View style={styles.nameLine}>
            <Text style={styles.mobileOfferName}>{offer.itemName}</Text>
            {featured ? <Text style={styles.bestTag}>LOWEST / PC</Text> : null}
          </View>
          <Text style={styles.storeName}>{location.displayName}</Text>
          <View style={styles.mobilePrices}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>PRICE</Text>
              <Text selectable style={[styles.mobilePrice, tabular]}>{money(offer.priceCents)}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>$/PIECE</Text>
              <Text selectable style={[styles.mobileUnit, tabular]}>{unitMoney(offer)}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>TYPE / COUNT</Text>
              <Text style={styles.pieceCount}>{offer.category} · {offer.pieceCount ?? '—'} pc</Text>
            </View>
          </View>
          <View style={styles.mobileFooter}>
            <View style={styles.provenance}>
              <Text style={[styles.status, stale && styles.stale]}>{freshnessText(offer)}</Text>
              <Text style={styles.source}>{offer.mockChecked} · {offer.sourceRecordId}</Text>
            </View>
            <Text style={styles.detailArrow}>↗</Text>
          </View>
        </>
      )}
    </LinkPressable>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.rule, borderLeftWidth: 5, borderLeftColor: 'transparent', paddingVertical: spacing.lg, paddingLeft: 19, paddingRight: spacing.xl, gap: spacing.sm },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: spacing.md },
  bestRow: { borderLeftColor: colors.yellow },
  pressed: { backgroundColor: colors.paleYellow },
  offerColumn: { flex: 3.2, minWidth: 0, gap: spacing.xs },
  chainColumn: { flex: 2.2, minWidth: 0, gap: spacing.xs },
  typeColumn: { flex: 1.2, alignItems: 'flex-start' },
  priceColumn: { flex: 1, minWidth: 68 },
  unitColumn: { flex: 1, minWidth: 60, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  offerName: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, flexShrink: 1 },
  offerSub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  bestTag: { color: colors.black, backgroundColor: colors.yellow, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, paddingVertical: 2, paddingHorizontal: 5 },
  chainName: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  storeName: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  typeChip: { color: colors.black, backgroundColor: colors.gray, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, paddingHorizontal: 7, paddingVertical: 5 },
  price: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 16, lineHeight: 23 },
  unit: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 13, lineHeight: 20 },
  perPiece: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  mobileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  distance: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16 },
  mobileOfferName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, flexShrink: 1 },
  mobilePrices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, paddingVertical: spacing.sm },
  fact: { gap: spacing.xs },
  factLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
  mobilePrice: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 22, lineHeight: 28 },
  mobileUnit: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 19, lineHeight: 28 },
  pieceCount: { color: colors.black, fontFamily: fonts.regular, fontSize: 12, lineHeight: 28, textTransform: 'capitalize' },
  mobileFooter: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  provenance: { flex: 1, gap: 3 },
  status: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.15 },
  source: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  stale: { color: colors.warning },
  detailArrow: { color: colors.black, fontSize: 20 },
});
