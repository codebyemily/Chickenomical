import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OfferRecord } from '@/data/live-offers';
import { quantityText } from '@/data/menu-schema';
import { money, unitMoney } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

type Props = {
  kind: 'value' | 'total';
  record: OfferRecord;
};

export function OfferPick({ kind, record }: Props) {
  const router = useRouter();
  const isValue = kind === 'value';
  const { offer, chain, location, distance_miles: distance } = record;
  const chainName = chain.name || chain.id;
  const storeName = location.store_name?.trim() || location.address?.trim() || 'Store details unavailable';
  const amount = isValue ? unitMoney(offer) : money(offer.list_price_cents, offer.currency);
  const total = money(offer.list_price_cents, offer.currency);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${isValue ? 'Best unit price' : 'Lowest total'}: ${chainName}, ${offer.original_name}, ${amount}`}
      onPress={() => router.push(offerDetailRoute(String(offer.id)) as never)}
      style={({ pressed }) => [styles.pick, isValue ? styles.valuePick : styles.totalPick, pressed && styles.pressed]}>
      <View pointerEvents="none" style={styles.bubbles}>
        <View style={styles.bubbleLarge} />
        <View style={styles.bubbleSmall} />
        <View style={styles.bubbleTiny} />
      </View>
      <View style={styles.pickContent}>
        <Text style={[styles.amount, tabular]}>{amount}</Text>
        <Text style={styles.amountHint}>{isValue ? `per ${offer.category ?? 'item'}` : 'for this order'}</Text>
        <View style={styles.pickRule} />
        <Text style={styles.restaurant}>{chainName}</Text>
        <Text style={styles.item} numberOfLines={2}>{offer.original_name} - {offer.quantity_label || quantityText(offer.category, offer.quantity)}</Text>
        <Text style={[styles.meta, tabular]}>{storeName} - {total} total - {distance == null ? 'Distance unavailable' : `${distance.toFixed(1)} mi away`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pick: {
    minHeight: 228,
    flex: 1,
    minWidth: 250,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 42,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  valuePick: { backgroundColor: colors.lime },
  totalPick: { backgroundColor: colors.blue },
  pressed: { opacity: 0.78 },
  bubbles: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  bubbleLarge: { position: 'absolute', width: 110, height: 110, borderRadius: radii.pill, right: -20, top: -42, backgroundColor: 'rgba(255,255,255,0.32)' },
  bubbleSmall: { position: 'absolute', width: 40, height: 40, borderRadius: radii.pill, right: 61, top: 33, backgroundColor: 'rgba(255,255,255,0.28)' },
  bubbleTiny: { position: 'absolute', width: 16, height: 16, borderRadius: radii.pill, right: 34, top: 61, backgroundColor: 'rgba(255,255,255,0.42)' },
  pickContent: { flex: 1, justifyContent: 'space-between', gap: spacing.xs, zIndex: 1 },
  amount: { color: colors.black, fontFamily: fonts.bold, fontSize: 34, lineHeight: 40 },
  amountHint: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  pickRule: { height: 1, backgroundColor: colors.black, opacity: 0.2, marginVertical: spacing.xs },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  item: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  meta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
});
