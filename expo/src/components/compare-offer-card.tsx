import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LinkPressable } from '@/components/link-pressable';
import type { OfferRecord } from '@/data/live-offers';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { colors, curve, fonts, ripple, spacing, tabular } from '@/theme';

type CompareOfferCardProps = {
  record: OfferRecord;
  jobId?: string;
  rank?: number;
  tone?: 'lime' | 'sky' | 'plain';
  primaryMetric?: 'unit' | 'total' | 'distance';
};

export function FeaturedOfferCard({ record, kind, compact = false }: { record: OfferRecord; jobId?: string; kind: 'unit' | 'total'; compact?: boolean }) {
  const { offer, chain, location, distance_miles: distance } = record;
  const itemCount = quantityText(offer.category, offer.quantity);
  const sourceLine = `${channelLabel(offer.ordering_channel)} - ${providerLabel(offer.source_provider)}`;
  const checked = checkedLabel(offer.observed_at);
  const headline = kind === 'unit' ? unitMoney(offer) : money(offer.list_price_cents, offer.currency);
  const headlineLabel = kind === 'unit' ? `per ${categoryUnit(offer.category, 1)}` : 'total menu price';
  const supportingPrice = kind === 'unit'
    ? `${money(offer.list_price_cents, offer.currency)} total`
    : `${unitMoney(offer)} per ${categoryUnit(offer.category, 1)}`;
  const order = orderAction(offer.ordering_channel);
  const orderUrl = orderUrlFor(offer.source_url);
  const ranking = kind === 'unit' ? 'Best quantity per dollar' : 'Lowest overall';

  return (
    <View
      accessibilityLabel={`${ranking}: ${headline} ${headlineLabel}, ${supportingPrice}, ${itemCount} at ${chain.name}, ${storeName(location.store_name, location.address)}, ${distanceText(distance)}. ${sourceLine}. ${checked}.`}
      style={[styles.featuredCard, compact && styles.featuredCardCompact, kind === 'unit' ? styles.limeCard : styles.skyCard]}>
      <Text style={[styles.featuredKind, kind === 'unit' ? styles.featuredKindLime : styles.featuredKindSky]}>{kind === 'unit' ? 'Best quantity per dollar' : 'Lowest overall'}</Text>
      <Text style={[styles.featuredQuantity, compact && styles.featuredQuantityCompact]}>{itemCount}</Text>
      <Text style={[styles.featuredRestaurant, compact && styles.featuredRestaurantCompact]}>{chain.name}</Text>
      <Text style={[styles.featuredLocation, compact && styles.featuredLocationCompact]}>{storeName(location.store_name, location.address)} - {distanceText(distance)}</Text>
      <Text style={[styles.featuredPrice, compact && styles.featuredPriceCompact, tabular]}>{headline}</Text>
      <Text style={[styles.featuredPriceDetail, compact && styles.featuredPriceDetailCompact]}>{supportingPrice}</Text>
      <Text numberOfLines={2} style={[styles.featuredSource, compact && styles.featuredSourceCompact]}>{sourceLine}</Text>
      {orderUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={order.label}
          accessibilityHint="Opens the restaurant’s ordering page."
          android_ripple={ripple}
          onPress={() => openOrderLink(orderUrl)}
          style={({ pressed }) => [styles.orderButton, compact && styles.orderButtonCompact, orderButtonStyle(order.tone), pressed && styles.pressed]}>
          <Text style={[styles.orderButtonText, compact && styles.orderButtonTextCompact, order.tone !== 'direct' && order.tone !== 'doordash' && styles.orderButtonTextDark]}>{order.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CompareOfferCard({
  record,
  jobId,
  rank,
  tone = 'plain',
  primaryMetric = 'unit',
}: CompareOfferCardProps) {
  const { offer, chain, location, distance_miles: distance } = record;
  const itemCount = quantityText(offer.category, offer.quantity);
  const freshness = freshnessText(offer);
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
    <LinkPressable
      href={offerDetailRoute(offer.id) as never}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the offer details and source."
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.resultCard,
        tone === 'lime' && styles.limeCard,
        tone === 'sky' && styles.skyCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.resultDetails}>
        <Text numberOfLines={1} style={styles.resultChain}>{chain.name}</Text>
        <Text numberOfLines={1} style={styles.resultName}>{offer.original_name}</Text>
        <Text numberOfLines={1} style={styles.resultLocation}>{storeName(location.store_name, location.address)} - {distanceText(distance)}</Text>
        <Text numberOfLines={1} style={styles.resultSource}>
          {channelLabel(offer.ordering_channel)} - {providerLabel(offer.source_provider)}
        </Text>
      </View>
      <View style={styles.resultPrice}>
        <Text numberOfLines={1} style={[styles.resultPrimary, tabular]}>{primaryValue}</Text>
        <Text style={styles.resultPriceLabel}>{primaryLabel}</Text>
        <Text numberOfLines={1} style={[styles.resultSecondary, tabular]}>{secondaryValue}</Text>
      </View>
    </LinkPressable>
  );
}

function orderAction(channel: string): { label: string; tone: 'direct' | 'doordash' | 'uber' | 'other' } {
  if (channel.startsWith('first_party')) return { label: 'Order Direct', tone: 'direct' };
  if (channel.startsWith('doordash')) return { label: 'Order from DoorDash', tone: 'doordash' };
  if (channel.startsWith('ubereats')) return { label: 'Order from Uber Eats', tone: 'uber' };
  const name = channelLabel(channel).replace(/ pickup$| delivery$/i, '');
  return { label: `Order from ${name}`, tone: 'other' };
}

function orderButtonStyle(tone: 'direct' | 'doordash' | 'uber' | 'other') {
  if (tone === 'doordash') return styles.orderDoorDash;
  if (tone === 'uber') return styles.orderUber;
  if (tone === 'other') return styles.orderOther;
  return styles.orderDirect;
}

function orderUrlFor(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function openOrderLink(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

function storeName(name: string | null, address: string | null) {
  return name ?? address ?? 'Store location unavailable';
}

function distanceText(distance: number | null) {
  return distance == null ? 'distance unavailable' : `${distance.toFixed(1)} mi away`;
}

function channelLabel(channel: string) {
  const labels: Record<string, string> = {
    first_party_pickup: 'Direct pickup',
    first_party_delivery: 'Direct delivery',
    doordash_pickup: 'DoorDash pickup',
    doordash_delivery: 'DoorDash delivery',
    ubereats_pickup: 'Uber Eats pickup',
    ubereats_delivery: 'Uber Eats delivery',
  };
  return labels[channel] ?? channel.replaceAll('_', ' ');
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
  featuredCard: { flex: 1, minWidth: 0, padding: spacing.md, borderRadius: 26, gap: 3, borderCurve: curve },
  featuredCardCompact: { padding: spacing.sm, borderRadius: 20 },
  limeCard: { backgroundColor: colors.lime },
  skyCard: { backgroundColor: colors.sky },
  featuredKind: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  featuredKindLime: { color: colors.limeInk },
  featuredKindSky: { color: colors.titleBlue },
  featuredQuantity: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  featuredQuantityCompact: { fontSize: 14, lineHeight: 18 },
  featuredRestaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  featuredRestaurantCompact: { fontSize: 14, lineHeight: 18 },
  featuredLocation: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  featuredLocationCompact: { fontSize: 11, lineHeight: 15 },
  featuredPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1, marginTop: spacing.sm },
  featuredPriceCompact: { fontSize: 34, lineHeight: 38, marginTop: spacing.xs },
  featuredPriceDetail: { color: colors.black, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  featuredPriceDetailCompact: { fontSize: 12, lineHeight: 17 },
  featuredSource: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  featuredSourceCompact: { fontSize: 11, lineHeight: 15, marginTop: spacing.xs },
  orderButton: { minHeight: 48, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16, borderCurve: curve, justifyContent: 'center', alignItems: 'center' },
  orderButtonCompact: { minHeight: 44, marginTop: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: 14 },
  orderDirect: { backgroundColor: colors.black },
  orderDoorDash: { backgroundColor: colors.orderDoorDash },
  orderUber: { backgroundColor: colors.orderUber },
  orderOther: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.black },
  orderButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  orderButtonTextCompact: { fontSize: 12, lineHeight: 16 },
  orderButtonTextDark: { color: colors.black },
  resultCard: { minHeight: 116, width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 22, borderCurve: 'continuous' },
  resultDetails: { flex: 1, minWidth: 0, gap: 1 },
  resultChain: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  resultName: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  resultLocation: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  resultSource: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  resultPrice: { minWidth: 84, alignItems: 'flex-end', gap: 1 },
  resultPrimary: { color: colors.black, fontFamily: fonts.bold, fontSize: 21, lineHeight: 26 },
  resultPriceLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  resultSecondary: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.72 },
});
