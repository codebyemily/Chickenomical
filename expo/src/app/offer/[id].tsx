import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading } from '@/components/app-frame';
import { useLiveOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { freshnessText, isRankable, money, unitMoney } from '@/lib/compare';
import { sourceRecordRoute } from '@/lib/live-offer-routes';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

const EMPTY_RECORDS: OfferRecord[] = [];

export default function OfferDetailScreen() {
  const { id: routeId, jobId: routeJobId } = useLocalSearchParams<{ id?: string | string[]; jobId?: string | string[] }>();
  const router = useRouter();
  const normalizedId = normalizeRouteId(routeId);
  const requestedJobId = normalizeRouteId(routeJobId) || undefined;
  const query = useLiveOffersQuery(requestedJobId);
  const boardJobId = requestedJobId ?? (query.status === 'success' ? query.metadata.job?._id : undefined);
  const records = query.status === 'success' ? query.data : EMPTY_RECORDS;
  const record = records.find(({ offer }) => String(offer.id) === normalizedId);
  const offer = record?.offer;
  const rankable = offer ? isRankable(offer) : false;
  const sourceId = offer?.source_item_id?.trim() || offer?.id || '';
  const chainName = offer ? record?.chain.name || offer.chain_id : '';
  const storeName = offer
    ? record?.location.store_name?.trim() || record?.location.id || offer.location_id
    : '';

  return (
    <AppFrame compact>
      <PageHeading
        title="Offer details."
        description="The live menu record, its price checks, and its source trail stay together."
      />

      {query.status === 'loading' ? <LoadingState /> : null}
      {query.status === 'error' ? (
        <NoticeBand title="Could not load offer records" tone="error">
          {query.error.message}
        </NoticeBand>
      ) : null}
      {query.status === 'success' && !record ? (
        <>
          <NoticeBand title="This offer was not found" tone="warning">
            {normalizedId
              ? `No live menu offer matches document ID ${normalizedId}.`
              : 'This route does not include a menu offer ID.'}
          </NoticeBand>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/' as never)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Back to comparison</Text>
          </Pressable>
        </>
      ) : null}

      {record && offer ? (
        <>
          <View style={[styles.offerSummary, rankable ? styles.summaryLime : styles.summarySky]}>
            <View style={styles.summaryBadges}>
              <Text style={styles.categoryBadge}>{categoryLabel(offer.category).toUpperCase()}</Text>
              <Text style={styles.statusBadge}>{rankable ? 'COMPARABLE PICKUP' : offer.validation_status.replaceAll('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.chainName}>{chainName}</Text>
            <Text accessibilityRole="header" style={styles.itemName}>{offer.original_name}</Text>
            <Text style={styles.storeLine}>
              {storeName}{record.distance_miles == null ? '' : ` · ${record.distance_miles.toFixed(1)} mi`}
            </Text>

            <View style={styles.priceSummary}>
              <View style={styles.primaryPrice}>
                <Text style={styles.priceLabel}>{rankable ? `PRICE PER ${categoryUnit(offer.category, 1).toUpperCase()}` : 'LISTED TOTAL'}</Text>
                <Text style={[styles.priceValue, tabular]}>
                  {rankable
                    ? unitMoney(offer)
                    : offer.list_price_cents == null
                      ? 'Price unavailable'
                      : money(offer.list_price_cents, offer.currency)}
                </Text>
              </View>
              <View style={styles.priceAside}>
                <Text style={styles.totalPrice}>{money(offer.list_price_cents, offer.currency)}</Text>
                <Text style={styles.totalLabel}>total menu price</Text>
                <Text style={styles.quantityLabel}>{offer.quantity_label || quantityText(offer.category, offer.quantity)}</Text>
              </View>
            </View>
          </View>

          {query.status === 'success' ? (
            <SnapshotCard
              observedAt={offer.observed_at}
              boardObservedAt={query.metadata.observed_at}
              job={query.metadata.job}
            />
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
            <Fact label="Prep and heat" value={[offer.prep, offer.heat].filter((value): value is string => value != null && value !== '').map(humanize).join(' · ') || 'Not stated'} />
            <Fact label="Build" value={offer.build || 'Not stated'} />
            <Fact label="Includes" value={offer.includes.length ? offer.includes.join(', ') : 'None stated'} />
            {offer.cut_mix ? <Fact label="Cut mix" value={Object.entries(offer.cut_mix).map(([cut, count]) => `${humanize(cut)}: ${count}`).join(', ')} /> : null}
            {offer.protein_pieces != null ? <Fact label="Protein pieces" value={String(offer.protein_pieces)} numeric /> : null}
            {offer.protein_category ? <Fact label="Protein category" value={categoryLabel(offer.protein_category)} /> : null}
          </FactCard>

          <SectionTitle title="Store location" />
          <FactCard>
            <Fact label="Restaurant" value={chainName} />
            <Fact label="Store" value={storeName} />
            <Fact label="Address" value={record.location.address?.trim() || 'Address not available'} />
            <Fact label="Distance" value={record.distance_miles == null ? 'Not available' : `${record.distance_miles.toFixed(1)} miles`} numeric />
            <Fact
              label="Coordinates"
              value={record.location.latitude == null || record.location.longitude == null
                ? 'Not available'
                : `${record.location.latitude}, ${record.location.longitude}`}
              numeric
            />
          </FactCard>

          <SectionTitle title="Source and validation" />
          <FactCard>
            <Fact label="Source provider" value={offer.source_provider} />
            <Fact label="Source item ID" value={offer.source_item_id?.trim() || 'Not provided'} selectable />
            <Fact label="Source URL" value={offer.source_url || 'Not provided'} selectable />
            <Fact label="Validation" value={offer.validation_status} />
            <Fact label="Comparable" value={offer.comparable ? 'Yes' : 'No'} />
            <Fact label="Observed at" value={formatDate(offer.observed_at)} />
            <Fact label="Product key" value={offer.product_key} selectable />
            <Fact label="Offer key" value={offer.offer_key} selectable />
          </FactCard>

          <NoticeBand title={rankable ? 'Eligible for unit-price comparison' : 'Not in unit-price ranking'} tone={rankable ? 'neutral' : 'warning'}>
            {freshnessText(offer)}. Check the original source before ordering.
          </NoticeBand>

          <Pressable
            accessibilityRole="link"
            accessibilityHint="Opens this offer’s source record from the live Convex board."
            onPress={() => router.push(sourceRecordRoute(sourceId, boardJobId) as never)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Open source record</Text>
            <Text accessibilityElementsHidden style={styles.buttonArrow}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Back to results</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/methodology' as never)} style={({ pressed }) => [styles.methodLink, pressed && styles.pressed]}>
            <Text style={styles.methodLinkText}>How comparisons work</Text>
          </Pressable>
        </>
      ) : null}
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
      <Text style={styles.loadingText}>Loading this offer from Convex…</Text>
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
  const status = job ? humanize(job.status) : 'Live board record';
  return (
    <View style={[styles.snapshotCard, failed && styles.snapshotFailed]}>
      <View style={styles.snapshotHeader}>
        <View style={[styles.statusDot, failed && styles.statusDotFailed, running && styles.statusDotRunning]} />
        <Text style={styles.snapshotTitle}>LIVE CONVEX SNAPSHOT</Text>
        <Text style={styles.snapshotStatus}>{status}</Text>
      </View>
      <Text style={styles.snapshotLine}>Offer checked {formatDate(observedAt)}</Text>
      <Text style={styles.snapshotLine}>Board data through {formatDate(boardObservedAt)}</Text>
      {job?.status === 'succeeded' ? (
        <Text style={styles.snapshotLine}>
          Scrape completed {formatDate(job.completed_at)} · {job.offer_count} offers reported
        </Text>
      ) : null}
      {job?.status === 'running' ? <Text style={styles.snapshotLine}>Scrape requested {formatDate(job.requested_at)}</Text> : null}
      {failed ? <Text style={styles.snapshotError}>{job.error?.trim() || 'The latest scrape failed without an error message.'}</Text> : null}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FactCard({ children }: PropsWithChildren) {
  return <View style={styles.factCard}>{children}</View>;
}

function Fact({ label, value, numeric = false, selectable = false }: { label: string; value: string; numeric?: boolean; selectable?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text selectable={selectable} style={[styles.factValue, numeric && tabular]}>{value}</Text>
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

const styles = StyleSheet.create({
  offerSummary: { padding: spacing.lg, gap: spacing.xs, borderRadius: radii.lg, borderCurve: 'continuous' },
  summaryLime: { backgroundColor: colors.lime },
  summarySky: { backgroundColor: colors.sky },
  summaryBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  categoryBadge: { overflow: 'hidden', color: colors.purple, backgroundColor: colors.white, fontFamily: fonts.bold, fontSize: 10, lineHeight: 16, letterSpacing: 0.5, paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  statusBadge: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, lineHeight: 16, letterSpacing: 0.45 },
  chainName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  itemName: { color: colors.black, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  storeLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  priceSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.18)' },
  primaryPrice: { flex: 1, minWidth: 0 },
  priceLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, lineHeight: 15, letterSpacing: 0.6 },
  priceValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 34, lineHeight: 41 },
  priceAside: { alignItems: 'flex-end', gap: 1, maxWidth: '46%' },
  totalPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  totalLabel: { color: colors.black, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  quantityLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, textAlign: 'right' },
  snapshotCard: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 20 },
  snapshotFailed: { borderColor: colors.danger, backgroundColor: colors.paleDanger },
  snapshotHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.purple },
  statusDotFailed: { backgroundColor: colors.danger },
  statusDotRunning: { backgroundColor: colors.orange },
  snapshotTitle: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, lineHeight: 15, letterSpacing: 0.6 },
  snapshotStatus: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, textTransform: 'capitalize' },
  snapshotLine: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  snapshotError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionAccent: { width: 4, height: 22, borderRadius: radii.pill, backgroundColor: colors.orange },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.35 },
  factCard: { paddingHorizontal: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 20 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1E8DF' },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  factValue: { flex: 1.45, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  loading: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: 20 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  primaryButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.purple, borderRadius: radii.pill },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  buttonArrow: { color: colors.white, fontFamily: fonts.regular, fontSize: 24, lineHeight: 28 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.pill },
  secondaryButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  methodLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  methodLinkText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.72 },
});
