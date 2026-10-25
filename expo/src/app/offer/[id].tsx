import { useLocalSearchParams } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { AppFrame, BackLink, NoticeBand } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { NearbyMap } from '@/components/nearby-map';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { freshnessText, isRankable, money, unitMoney } from '@/lib/compare';
import { decorative } from '@/lib/a11y';
import { sourceRecordRoute } from '@/lib/live-offer-routes';
import type { LatLng } from '@/lib/distance';
import { canOpenOrderLink, openOrderLink } from '@/lib/order-links';
import { colors, fonts, radii, spacing, tabular } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

const EMPTY_RECORDS: OfferRecord[] = [];

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Chicken menu offer details',
  'Review the menu name, price, location, comparison details, and source for one offer.',
);

export default function OfferDetailScreen() {
  const { id: routeId, jobId: routeJobId } = useLocalSearchParams<{ id?: string | string[]; jobId?: string | string[] }>();
  const normalizedId = normalizeRouteId(routeId);
  const requestedJobId = normalizeRouteId(routeJobId) || undefined;
  const query = useLiveOffersQuery(requestedJobId);
  const recentQuery = useRecentOffersQuery();
  const boardRecords = query.status === 'success' ? query.data : EMPTY_RECORDS;
  const recentRecords = recentQuery.status === 'success' ? recentQuery.data : EMPTY_RECORDS;
  const boardRecord = boardRecords.find(({ offer }) => String(offer.id) === normalizedId);
  const recentRecord = recentRecords.find(({ offer }) => String(offer.id) === normalizedId);
  const record = boardRecord ?? recentRecord;
  const boardJobId = boardRecord
    ? requestedJobId ?? (query.status === 'success' ? query.metadata.job?._id : undefined)
    : undefined;
  const recordStillLoading = !record && (query.status === 'loading' || recentQuery.status === 'loading');
  const offer = record?.offer;
  const rankable = offer ? isRankable(offer) : false;
  const sourceId = offer?.source_item_id?.trim() || offer?.id || '';
  const chainName = offer ? record?.chain.name || offer.chain_id : '';
  const storeName = offer
    ? record?.location.store_name?.trim() || record?.location.id || offer.location_id
    : '';
  const storeAddress = offer ? record?.location.address?.trim() || 'Address not available' : '';
  const storePoint: LatLng | null = record?.location.latitude != null && record.location.longitude != null
    ? { latitude: record.location.latitude, longitude: record.location.longitude }
    : null;
  const mapsUrl = offer ? mapsUrlFor(chainName, storeAddress, storePoint) : null;
  const hasOrderLink = offer ? canOpenOrderLink(offer) : false;
  const orderLabelText = offer ? orderLabel(offer.ordering_channel, chainName) : '';

  return (
    <AppFrame compact edgeToEdgeTop surface="compare">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <BackLink label="Compare" tone="orange" />
          <HeadingText level={1} style={styles.heroTitle}>Offer details.</HeadingText>
          <Text style={styles.heroDescription}>
            {record && offer
              ? `${chainName} - ${storeName}`
              : 'Review the menu item, price math, location, and source together.'}
          </Text>
        </View>

        <View style={styles.content}>
          {recordStillLoading ? <LoadingState /> : null}
          {query.status === 'error' ? (
            <NoticeBand title="Could not load offers" tone="error">
              {recentQuery.status === 'success' && recentRecord
                ? 'The current comparison is unavailable. An earlier offer is still shown below.'
                : 'The current comparison board could not be reached.'}
            </NoticeBand>
          ) : null}
          {recentQuery.status === 'error' && !boardRecord ? (
            <NoticeBand title="Could not check saved offers" tone="warning">
              The saved offer check is unavailable. Try again later or return to Compare.
            </NoticeBand>
          ) : null}
          {query.status !== 'loading' && recentQuery.status !== 'loading' && !record ? (
            <View style={styles.emptyCard}>
              <HeadingText level={2} style={styles.emptyTitle}>This offer moved off the board.</HeadingText>
              <Text style={styles.emptyCopy}>
                This offer is no longer in the current comparison or saved offers. Try another offer from Compare.
              </Text>
              <LinkPressable href="/" replace style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Back to Compare</Text>
              </LinkPressable>
            </View>
          ) : null}

          {record && offer ? (
            <>
          <View style={[styles.offerSummary, rankable ? styles.summaryLime : styles.summarySky]}>
            <Text style={styles.chainName}>{chainName}</Text>
            <HeadingText level={2} style={styles.itemName}>{offer.original_name}</HeadingText>
            <Text style={styles.storeLine}>
              {storeName}{record.distance_miles == null ? '' : ` - ${record.distance_miles.toFixed(1)} mi`}
            </Text>

            <View style={styles.priceSummary}>
              <Text style={[styles.priceValue, tabular]}>
                {rankable
                  ? unitMoney(offer)
                  : offer.list_price_cents == null
                    ? 'Price unavailable'
                    : money(offer.list_price_cents, offer.currency)}
              </Text>
              <Text style={styles.priceSupport}>
                {money(offer.list_price_cents, offer.currency)} total - {offer.quantity_label || quantityText(offer.category, offer.quantity)}
              </Text>
              {hasOrderLink ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={orderLabelText}
                  accessibilityHint="Opens the restaurant’s ordering page."
                  onPress={() => openOrderLink(offer, record.location)}
                  style={({ pressed }) => [styles.orderButton, pressed && styles.pressed]}>
                  <Text style={styles.orderButtonText}>{orderLabelText}</Text>
                  <Text {...decorative} style={styles.buttonArrow}>↗</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {boardRecord && query.status === 'success' ? (
            <SnapshotCard
              observedAt={offer.observed_at}
              boardObservedAt={query.metadata.observed_at}
              job={query.metadata.job}
            />
          ) : null}
          {recentRecord && !boardRecord ? (
            <View style={styles.storedNote}>
              <Text style={styles.storedNoteText}>This offer comes from an earlier update than the current comparison.</Text>
            </View>
          ) : null}

          <SectionTitle title="Offer details" />
          <FactCard>
            <Fact label="Original menu name" value={offer.original_name} />
            <Fact label="Category" value={categoryLabel(offer.category)} />
            <Fact label="Offer kind" value={humanize(offer.offer_kind)} />
            <Fact label="Quantity" value={quantityText(offer.category, offer.quantity)} />
            <Fact label="Quantity label" value={offer.quantity_label || 'Not stated'} />
            <Fact label="List price" value={money(offer.list_price_cents, offer.currency)} numeric />
            <Fact label="Currency" value={offer.currency} />
            <Fact label="Unit price" value={rankable ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not calculated'} numeric />
            <Fact label="Ordering channel" value={humanize(offer.ordering_channel)} />
            <Fact label="Prep and heat" value={[offer.prep, offer.heat].filter((value): value is string => value != null && value !== '').map(humanize).join(' - ') || 'Not stated'} />
            <Fact label="Build" value={offer.build || 'Not stated'} />
            <Fact label="Includes" value={offer.includes.length ? offer.includes.join(', ') : 'None stated'} />
            {offer.cut_mix ? <Fact label="Cut mix" value={Object.entries(offer.cut_mix).map(([cut, count]) => `${humanize(cut)}: ${count}`).join(', ')} /> : null}
            {offer.protein_pieces != null ? <Fact label="Protein pieces" value={String(offer.protein_pieces)} numeric /> : null}
            {offer.protein_category ? <Fact label="Protein category" value={categoryLabel(offer.protein_category)} /> : null}
          </FactCard>

          <SectionTitle title="Store location" />
          <View style={styles.locationCard}>
            {storePoint ? (
              <NearbyMap
                origin={storePoint}
                originLabel={`${chainName} location.`}
                places={[]}
                radiusMiles={0.5}
              />
            ) : (
              <View style={styles.mapUnavailable}>
                <Text style={styles.mapUnavailableTitle}>Map unavailable</Text>
                <Text style={styles.mapUnavailableCopy}>This location did not include coordinates.</Text>
              </View>
            )}
            <View style={styles.locationCopy}>
              <Text style={styles.locationBrand}>{chainName}</Text>
              <Text style={styles.locationAddress}>{storeAddress}</Text>
              {record.distance_miles != null ? <Text style={styles.locationDistance}>{record.distance_miles.toFixed(1)} miles away</Text> : null}
            </View>
            {mapsUrl ? (
              <View style={styles.locationActions}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open location in Maps"
                  onPress={() => openMapsLink(mapsUrl)}
                  style={({ pressed }) => [styles.locationAction, styles.locationActionPrimary, pressed && styles.pressed]}>
                  <Text style={styles.locationActionPrimaryText}>Open in Maps</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share map location"
                  onPress={() => { void shareMapsLink(mapsUrl, chainName); }}
                  style={({ pressed }) => [styles.locationAction, styles.locationActionSecondary, pressed && styles.pressed]}>
                  <Text style={styles.locationActionSecondaryText}>Share</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <SectionTitle title="Source details" />
          <FactCard>
            <Fact label="Source" value={offer.source_provider} />
            <Fact label="Source URL" value={offer.source_url || 'Not provided'} />
            <Fact label="Price check" value={offer.validation_status} />
            <Fact label="In comparison" value={offer.comparable ? 'Yes' : 'No'} />
            <Fact label="Observed at" value={formatDate(offer.observed_at)} />
          </FactCard>

          <NoticeBand title={rankable ? 'Eligible for unit-price comparison' : 'Not in unit-price ranking'} tone={rankable ? 'neutral' : 'warning'}>
            {freshnessText(offer)}. Check the original source before ordering.
          </NoticeBand>

          <LinkPressable
            href={sourceRecordRoute(sourceId, boardJobId) as never}
            accessibilityHint="Opens this offer’s source details."
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Open source details</Text>
            <Text {...decorative} style={styles.buttonArrow}>›</Text>
          </LinkPressable>
          {Platform.OS === 'web' ? (
            <LinkPressable href="/" replace style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>Back to Compare</Text>
            </LinkPressable>
          ) : null}
          <LinkPressable href="/methodology" style={({ pressed }) => [styles.methodLink, pressed && styles.pressed]}>
            <Text style={styles.methodLinkText}>How comparisons work</Text>
          </LinkPressable>
            </>
          ) : null}
        </View>
      </View>
    </AppFrame>
  );
}

function normalizeRouteId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value[0] : value;
  return id?.trim() ?? '';
}

function LoadingState() {
  return (
    <View accessibilityRole="progressbar" style={styles.loading}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingText}>Loading offer details…</Text>
    </View>
  );
}

function SnapshotCard({
  observedAt,
  boardObservedAt,
  job,
}: {
  observedAt: string;
  boardObservedAt: string | null;
  job: { status: string; offer_count: number; error: string | null; requested_at: string; completed_at: string | null } | null;
}) {
  const failed = job?.status === 'failed';
  const running = job?.status === 'running';
  const status = job ? humanize(job.status) : 'Latest offer';
  return (
    <View style={[styles.snapshotCard, failed && styles.snapshotFailed]}>
      <View style={styles.snapshotHeader}>
        <View style={[styles.statusDot, failed && styles.statusDotFailed, running && styles.statusDotRunning]} />
        <Text style={styles.snapshotStatus}>{status}</Text>
      </View>
      <Text style={styles.snapshotLine}>Offer checked {formatDate(observedAt)}</Text>
      <Text style={styles.snapshotLine}>Board data through {formatDate(boardObservedAt)}</Text>
      {job?.status === 'succeeded' ? (
        <Text style={styles.snapshotLine}>
          Update completed {formatDate(job.completed_at)} - {job.offer_count} offers found
        </Text>
      ) : null}
      {job?.status === 'running' ? <Text style={styles.snapshotLine}>Update requested {formatDate(job.requested_at)}</Text> : null}
      {failed ? <Text style={styles.snapshotError}>The latest menu check did not finish. This offer may be from an earlier check.</Text> : null}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <HeadingText level={2} style={styles.sectionTitle}>{title}</HeadingText>
    </View>
  );
}

function FactCard({ children }: PropsWithChildren) {
  return <View style={styles.factCard}>{children}</View>;
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text selectable style={[styles.factValue, numeric && tabular]}>{value}</Text>
    </View>
  );
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function formatDate(value: string | null) {
  if (!value) return 'Not stated';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not stated'
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function orderLabel(channel: string, chainName: string) {
  if (channel.startsWith('first_party')) return 'Order Direct';
  if (channel.startsWith('doordash')) return 'Order from DoorDash';
  if (channel.startsWith('ubereats')) return 'Order from Uber Eats';
  return `Order from ${chainName}`;
}

function mapsUrlFor(chainName: string, address: string, point: LatLng | null) {
  const query = [chainName, address !== 'Address not available' ? address : null]
    .filter(Boolean)
    .join(', ') || (point ? `${point.latitude},${point.longitude}` : '');
  return query ? `https://maps.apple.com/?q=${encodeURIComponent(query)}` : null;
}

function openMapsLink(url: string) {
  void Linking.openURL(url);
}

async function shareMapsLink(url: string, title: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    await Share.share({ message: url, title, url });
  } catch {
    // Sharing can be canceled by the user; there is nothing to recover here.
  }
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: 0 },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm, backgroundColor: colors.orange, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 32, lineHeight: 37, letterSpacing: -1 },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  emptyCard: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.paleWarning, borderWidth: 1, borderColor: colors.warning, borderRadius: radii.lg },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  emptyCopy: { color: colors.black, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  offerSummary: { padding: spacing.lg, gap: spacing.xs, borderRadius: radii.lg, borderCurve: 'continuous' },
  summaryLime: { backgroundColor: colors.lime },
  summarySky: { backgroundColor: colors.sky },
  chainName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  itemName: { color: colors.black, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  storeLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  priceSummary: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.18)' },
  priceValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 56, lineHeight: 62, textAlign: 'center' },
  priceSupport: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  snapshotCard: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 20 },
  snapshotFailed: { borderColor: colors.danger, backgroundColor: colors.paleDanger },
  snapshotHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.purple },
  statusDotFailed: { backgroundColor: colors.danger },
  statusDotRunning: { backgroundColor: colors.orange },
  snapshotStatus: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, textTransform: 'capitalize' },
  snapshotLine: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  snapshotError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  storedNote: { padding: spacing.md, backgroundColor: colors.paleWarning, borderWidth: 1, borderColor: colors.warning, borderRadius: radii.md },
  storedNoteText: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionAccent: { width: 4, height: 22, borderRadius: radii.pill, backgroundColor: colors.orange },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.35 },
  locationCard: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 20 },
  locationCopy: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  locationBrand: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25 },
  locationAddress: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  locationDistance: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  locationActions: { flexDirection: 'row', gap: spacing.sm },
  locationAction: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  locationActionPrimary: { backgroundColor: colors.purple },
  locationActionPrimaryText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  locationActionSecondary: { borderWidth: 1, borderColor: colors.purple, backgroundColor: colors.white },
  locationActionSecondaryText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 14 },
  mapUnavailable: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.cream, borderRadius: 18 },
  mapUnavailableTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 15 },
  mapUnavailableCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  factCard: { paddingHorizontal: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 20 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.factRule },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  factValue: { flex: 1.45, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  loading: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: 20 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  primaryButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.purple, borderRadius: radii.pill },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  orderButton: { minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.purple, borderRadius: radii.pill },
  orderButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  buttonArrow: { color: colors.white, fontFamily: fonts.regular, fontSize: 24, lineHeight: 28 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.pill },
  secondaryButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  methodLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  methodLinkText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.72 },
});
