import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OfferRecord } from '@/data/live-offers';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { colors, fonts, spacing, tabular } from '@/theme';

type CompareOfferCardProps = {
  record: OfferRecord;
  jobId?: string;
  rank?: number;
  tone?: 'lime' | 'sky' | 'plain';
  primaryMetric?: 'unit' | 'total' | 'distance';
};

export function FeaturedOfferCard({ record, jobId, kind }: { record: OfferRecord; jobId?: string; kind: 'unit' | 'total' }) {
  const router = useRouter();
  const { offer, chain, location, distance_miles: distance } = record;
  const itemCount = quantityText(offer.category, offer.quantity);
  const sourceLine = `${providerLabel(offer.source_provider)} · ${checkedLabel(offer.observed_at)}`;
  const headline = kind === 'unit' ? unitMoney(offer) : money(offer.list_price_cents, offer.currency);
  const headlineLabel = kind === 'unit' ? `per ${categoryUnit(offer.category, 1)}` : 'total menu price';
  const supportingPrice = kind === 'unit'
    ? `${money(offer.list_price_cents, offer.currency)} total`
    : `${unitMoney(offer)} per ${categoryUnit(offer.category, 1)}`;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${kind === 'unit' ? 'Best price per unit' : 'Lowest menu total'} within this comparable group: ${headline} ${headlineLabel}, ${itemCount} at ${chain.name}, ${storeName(location.store_name, location.address)}, ${distanceText(distance)}. ${sourceLine}.`}
      accessibilityHint="Opens the offer details and source."
      onPress={() => router.push(offerDetailRoute(offer.id, jobId) as never)}
      style={({ pressed }) => [styles.featuredCard, kind === 'unit' ? styles.limeCard : styles.skyCard, pressed && styles.pressed]}>
      <Text style={styles.featuredLabel}>{kind === 'unit' ? 'BEST VALUE' : 'LOWEST TOTAL'}</Text>
      <Text style={styles.featuredSubheading}>{kind === 'unit' ? `per ${categoryUnit(offer.category, 1)}` : 'for this listed pack'}</Text>
      <Text style={styles.featuredQuantity}>{itemCount}</Text>
      <Text numberOfLines={1} style={styles.featuredRestaurant}>{chain.name}</Text>
      <Text numberOfLines={2} style={styles.featuredLocation}>{storeName(location.store_name, location.address)} · {distanceText(distance)}</Text>
      <Text style={[styles.featuredPrice, tabular]}>{headline}</Text>
      <Text style={styles.featuredPriceDetail}>{supportingPrice}</Text>
      <Text numberOfLines={1} style={styles.featuredSource}>{sourceLine}</Text>
      <View style={styles.featuredAction}>
        <Text style={styles.featuredActionText}>View source details</Text>
        <Text accessibilityElementsHidden style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

export function CompareOfferCard({
  record,
  jobId,
  rank,
  tone = 'plain',
  primaryMetric = 'unit',
}: CompareOfferCardProps) {
  const router = useRouter();
  const { offer, chain, location, distance_miles: distance } = record;
  const itemCount = quantityText(offer.category, offer.quantity);
  const freshness = freshnessText(offer);
  const stale = freshness.startsWith('STALE');
  const total = money(offer.list_price_cents, offer.currency);
  const perUnit = unitMoney(offer);
  const rankText = rank == null ? '' : `Result ${rank}`;
  const accessibilityLabel = [
    rankText,
    itemCount,
    categoryLabel(offer.category),
    offer.original_name,
    chain.name,
    storeName(location.store_name, location.address),
    distanceText(distance),
    `${perUnit} per ${categoryUnit(offer.category, 1)}`,
    `${total} total`,
    providerLabel(offer.source_provider),
    freshness,
    checkedLabel(offer.observed_at),
  ].filter(Boolean).join('. ');

  let primaryValue = perUnit;
  let primaryLabel = `per ${categoryUnit(offer.category, 1)}`;
  let secondaryValue = `${total} total`;
  if (primaryMetric === 'total') {
    primaryValue = total;
    primaryLabel = 'total';
    secondaryValue = `${perUnit} per ${categoryUnit(offer.category, 1)}`;
  } else if (primaryMetric === 'distance') {
    primaryValue = distance == null ? '—' : `${distance.toFixed(1)} mi`;
    primaryLabel = 'away';
    secondaryValue = `${perUnit} per ${categoryUnit(offer.category, 1)}`;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the offer details and source."
      onPress={() => router.push(offerDetailRoute(offer.id, jobId) as never)}
      style={({ pressed }) => [
        styles.resultCard,
        tone === 'lime' && styles.limeCard,
        tone === 'sky' && styles.skyCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.resultSize}>
        <Text numberOfLines={2} style={styles.resultQuantity}>{offer.quantity_label ?? itemCount}</Text>
        <Text numberOfLines={2} style={styles.resultCategory}>{categoryLabel(offer.category)}</Text>
      </View>
      <View style={styles.resultDetails}>
        <Text numberOfLines={1} style={styles.resultChain}>{chain.name}</Text>
        <Text numberOfLines={1} style={styles.resultName}>{offer.original_name}</Text>
        <Text numberOfLines={1} style={styles.resultLocation}>{storeName(location.store_name, location.address)} · {distanceText(distance)}</Text>
        <Text numberOfLines={1} style={[styles.resultSource, stale && styles.stale]}>
          {providerLabel(offer.source_provider)} · {stale ? 'stale' : 'verified'} · {checkedLabel(offer.observed_at)}
        </Text>
      </View>
      <View style={styles.resultPrice}>
        {rank != null ? <Text style={styles.resultRank}>#{rank}</Text> : null}
        <Text numberOfLines={1} style={[styles.resultPrimary, tabular]}>{primaryValue}</Text>
        <Text style={styles.resultPriceLabel}>{primaryLabel}</Text>
        <Text numberOfLines={1} style={[styles.resultSecondary, tabular]}>{secondaryValue}</Text>
      </View>
    </Pressable>
  );
}

function storeName(name: string | null, address: string | null) {
  return name ?? address ?? 'Store location unavailable';
}

function distanceText(distance: number | null) {
  return distance == null ? 'distance unavailable' : `${distance.toFixed(1)} mi`;
}

function providerLabel(provider: string) {
  return provider.replaceAll('_', ' ');
}

function checkedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 0) return 'just checked';
  if (minutes < 1) return 'just checked';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

const styles = StyleSheet.create({
  featuredCard: { flex: 1, minWidth: 0, padding: spacing.md, borderRadius: 26, gap: 3, borderCurve: 'continuous' },
  limeCard: { backgroundColor: colors.lime },
  skyCard: { backgroundColor: colors.sky },
  featuredLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, letterSpacing: 0.25 },
  featuredSubheading: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  featuredQuantity: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, marginTop: spacing.xs },
  featuredRestaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  featuredLocation: { color: colors.black, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  featuredPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 25, lineHeight: 31, marginTop: spacing.xs },
  featuredPriceDetail: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  featuredSource: { color: colors.black, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, marginTop: spacing.sm },
  featuredAction: { minHeight: 44, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.2)', marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredActionText: { color: colors.black, fontFamily: fonts.bold, fontSize: 12 },
  arrow: { color: colors.black, fontFamily: fonts.regular, fontSize: 22, lineHeight: 26 },
  resultCard: { minHeight: 116, width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 22, borderCurve: 'continuous' },
  resultSize: { width: 56, flexShrink: 0, gap: 2 },
  resultQuantity: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 },
  resultCategory: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  resultDetails: { flex: 1, minWidth: 0, gap: 1 },
  resultChain: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  resultName: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  resultLocation: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  resultSource: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  stale: { color: colors.warning },
  resultPrice: { minWidth: 84, alignItems: 'flex-end', gap: 1 },
  resultRank: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, lineHeight: 13 },
  resultPrimary: { color: colors.black, fontFamily: fonts.bold, fontSize: 21, lineHeight: 26 },
  resultPriceLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 10, lineHeight: 13 },
  resultSecondary: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  pressed: { opacity: 0.72 },
});
