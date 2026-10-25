import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { AppFrame, BackLink, NoticeBand, SectionHeading } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryUnit } from '@/data/menu-schema';
import { isRankable, money, unitMoney } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { isWingstopApiMenuUrl } from '@/lib/order-links';
import { colors, fonts, radii, spacing, tabular } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

const EMPTY_RECORDS: OfferRecord[] = [];

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Chicken menu source details',
  'See where a chicken menu offer came from, its location, timing, and price check.',
);

export default function SourceDetailScreen() {
  const { id: routeId, jobId: routeJobId } = useLocalSearchParams<{ id?: string | string[]; jobId?: string | string[] }>();
  const normalizedId = normalizeRouteId(routeId);
  const requestedJobId = normalizeRouteId(routeJobId) || undefined;
  const boardQuery = useLiveOffersQuery(requestedJobId);
  const recentQuery = useRecentOffersQuery();
  const boardRecords = boardQuery.status === 'success' ? boardQuery.data : EMPTY_RECORDS;
  const recentRecords = recentQuery.status === 'success' ? recentQuery.data : EMPTY_RECORDS;

  const boardRecord = useMemo(() => findRecord(boardRecords, normalizedId), [boardRecords, normalizedId]);
  // A route scoped to a scrape job must stay in that job. Sources links omit jobId,
  // so those can safely resolve older stored rows through the bounded recent query.
  const recentRecord = useMemo(
    () => requestedJobId ? undefined : findRecord(recentRecords, normalizedId),
    [normalizedId, recentRecords, requestedJobId],
  );
  const record = boardRecord ?? recentRecord;
  const offer = record?.offer;
  const boardJobId = boardRecord && boardQuery.status === 'success'
    ? requestedJobId ?? boardQuery.metadata.job?._id
    : undefined;
  const boardSettled = boardQuery.status !== 'loading';
  const recentSettled = recentQuery.status !== 'loading';
  const recentFallbackEnabled = !requestedJobId;
  const notFound = boardSettled && (!recentFallbackEnabled || recentSettled) && !record;
  const lookupScope = requestedJobId
    ? 'That offer is not available in this update.'
    : boardQuery.status === 'error'
      ? 'The current comparison is unavailable, so this offer could not be found.'
      : recentQuery.status === 'error'
        ? 'The saved offer check is unavailable, so this offer could not be found.'
        : 'That offer is not on the current comparison or in saved offers.';

  return (
    <AppFrame active="Explore" edgeToEdgeTop nativeSurface="compare" surface="compare" showDataNotice={false}>
      <View style={styles.screen}>
        <View style={[styles.hero, Platform.OS !== 'web' && styles.heroNative, Platform.OS === 'web' && styles.heroWeb]}>
          <BackLink label="Back to Sources" fallback="/sources" tone="orange" />
          <HeadingText level={1} style={styles.heroTitle}>See where this offer came from.</HeadingText>
          <Text style={styles.heroDescription}>Review the menu item, restaurant, location, and source link.</Text>
          <View style={styles.heroWave}>
            <View style={styles.waveDot} />
            <View style={styles.waveLine} />
            <View style={styles.waveDotSmall} />
            <View style={styles.waveLine} />
            <View style={styles.waveDot} />
          </View>
        </View>

        {!record && (boardQuery.status === 'loading' || (recentFallbackEnabled && recentQuery.status === 'loading')) ? <LoadingState /> : null}

        {boardQuery.status === 'error' ? (
          <NoticeBand title="Latest board data is unavailable" tone="warning">
            {recentQuery.status === 'success' ? 'The current comparison is temporarily unavailable. Saved offers can still be checked below.' : 'The current comparison is temporarily unavailable. Try again in a moment.'}
          </NoticeBand>
        ) : null}
        {recentFallbackEnabled && recentQuery.status === 'error' && !boardRecord ? (
          <NoticeBand title="Saved offer check failed" tone="error">
            Saved offers are temporarily unavailable. Try again in a moment.
          </NoticeBand>
        ) : null}
        {notFound ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching source details were found.</Text>
            <Text style={styles.emptyCopy}>
              {normalizedId ? lookupScope : 'This offer link is missing its offer ID.'}
            </Text>
            <LinkPressable href="/sources" replace style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Back to Sources</Text>
            </LinkPressable>
          </View>
        ) : null}

        {record && offer ? (
          <>
            {recentFallbackEnabled && recentQuery.status === 'error' && boardRecord ? (
              <NoticeBand title="Saved offer check is unavailable" tone="warning">
                The matching offer came from the current comparison. Older saved offers could not be checked.
              </NoticeBand>
            ) : null}

            <SectionHeading title="Menu offer" />
            <View style={styles.featureCard}>
              <Text style={styles.offerName}>{offer.original_name}</Text>
              <Text style={styles.chainLine}>{record.chain.name}</Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={[styles.price, tabular]}>{money(offer.list_price_cents, offer.currency)}</Text>
                </View>
                <View style={styles.priceUnitBlock}>
                  <Text style={[styles.priceUnit, tabular]}>
                    {isRankable(offer) ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not calculated'}
                  </Text>
                </View>
              </View>
            </View>

            <SectionHeading title="Details" />
            <View style={styles.fieldGroup}>
              <Text style={styles.groupTitle}>Source</Text>
              <FieldRow label="Source" value={offer.source_provider} />
              <FieldRow
                label="Link"
                value={offer.source_url}
                href={isWingstopApiMenuUrl(offer.chain_id, offer.source_url) ? undefined : offer.source_url || undefined}
              />
            </View>

            <View style={[styles.fieldGroup, styles.fieldGroupSky]}>
              <Text style={styles.groupTitle}>Restaurant and location</Text>
              <FieldRow label="Store name" value={record.location.store_name} />
              <FieldRow label="Address" value={record.location.address} />
              <FieldRow label="Distance" value={record.distance_miles == null ? null : `${record.distance_miles} miles`} />
            </View>

            <View style={[styles.fieldGroup, styles.fieldGroupWhite]}>
              <Text style={styles.groupTitle}>Offer details</Text>
              <FieldRow label="Category" value={offer.category} />
              <FieldRow label="Menu type" value={humanize(offer.offer_kind)} />
              <FieldRow label="Quantity" value={offer.quantity} />
              <FieldRow label="Quantity label" value={offer.quantity_label} />
              <FieldRow label="List price" value={money(offer.list_price_cents, offer.currency)} />
              <FieldRow label="Currency" value={offer.currency} />
              <FieldRow label="Protein category" value={offer.protein_category} />
              <FieldRow label="Protein pieces" value={offer.protein_pieces} />
              <FieldRow label="Prep" value={offer.prep} />
              <FieldRow label="Heat" value={offer.heat} />
              <FieldRow label="Build" value={offer.build} />
              <FieldRow label="Cut mix" value={offer.cut_mix} />
              <FieldRow label="Includes" value={offer.includes} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.groupTitle}>Ordering</Text>
              <FieldRow label="Ordering" value={humanize(offer.ordering_channel)} />
              <FieldRow label="Updated" value={offer.observed_at} date />
              <FieldRow label="Price check" value={offer.validation_status === 'verified' ? 'Checked' : 'Needs a check'} />
              <FieldRow label="In comparison" value={offer.comparable} />
            </View>

            <LinkPressable
              href={offerDetailRoute(String(offer.id), boardJobId) as never}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Open offer details →</Text>
            </LinkPressable>
          </>
        ) : null}
      </View>
    </AppFrame>
  );
}

function findRecord(records: OfferRecord[], id: string) {
  if (!id) return undefined;
  return records.find(({ offer }) => String(offer.id) === id)
    ?? records.find(({ offer }) => offer.source_item_id?.trim() === id);
}

function normalizeRouteId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value[0] : value;
  return id?.trim() ?? '';
}

function LoadingState() {
  return (
    <View accessibilityRole="progressbar" style={styles.loading}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingText}>Loading source details…</Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  date = false,
  href,
}: {
  label: string;
  value: unknown;
  date?: boolean;
  href?: string;
}) {
  const display = formatValue(value, date);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {href && value ? (
        <LinkPressable href={href as never} accessibilityLabel={`Open ${label}`} style={({ pressed }) => [styles.fieldValueLink, pressed && styles.pressed]}>
          <Text selectable style={styles.fieldValueLinkText}>Open source</Text>
        </LinkPressable>
      ) : (
        <Text selectable style={styles.fieldValue}>{display}</Text>
      )}
    </View>
  );
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function formatValue(value: unknown, date: boolean) {
  if (value == null || value === '') return 'Not stated';
  if (date && typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None available';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: spacing.lg },
  hero: { backgroundColor: colors.orange, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, marginHorizontal: -spacing.lg, marginTop: -spacing.xl, gap: spacing.sm, overflow: 'hidden' },
  heroNative: { marginHorizontal: -spacing.lg, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  heroWeb: { marginHorizontal: 0, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, maxWidth: 580 },
  heroWave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, opacity: 0.6 },
  waveDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.cream },
  waveDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cream },
  waveLine: { flex: 1, height: 2, marginHorizontal: spacing.sm, backgroundColor: colors.cream, borderRadius: 2 },
  loading: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radii.lg },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  sourceCard: { padding: spacing.lg, backgroundColor: colors.purple, borderRadius: radii.lg, gap: spacing.md },
  sourceCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  sourceCopy: { flex: 1, gap: spacing.xs },
  sourceLabel: { color: colors.white, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  sourceId: { color: colors.white, fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 27 },
  originPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  originPillBoard: { backgroundColor: colors.lime },
  originPillStored: { backgroundColor: colors.sky },
  originPillText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7 },
  originNote: { color: colors.white, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  featureCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.lime, gap: spacing.sm },
  offerName: { color: colors.black, fontFamily: fonts.bold, fontSize: 25, lineHeight: 30 },
  chainLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 14 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.22)' },
  priceLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  price: { color: colors.black, fontFamily: fonts.bold, fontSize: 27, lineHeight: 32 },
  priceUnitBlock: { alignItems: 'flex-end', maxWidth: '55%' },
  priceUnit: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, textAlign: 'right' },
  fieldGroup: { backgroundColor: colors.paleYellow, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  fieldGroupSky: { backgroundColor: colors.sky },
  fieldGroupWhite: { backgroundColor: colors.white },
  groupTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, paddingBottom: spacing.xs },
  fieldRow: { gap: spacing.xs, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(16,16,16,0.1)' },
  fieldLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.2 },
  fieldValue: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  fieldValueLink: { alignSelf: 'flex-start', maxWidth: '100%' },
  fieldValueLinkText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  primaryButton: { minHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.yellow, borderRadius: radii.pill },
  primaryButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 17 },
  emptyCard: { padding: spacing.lg, backgroundColor: colors.sky, borderRadius: radii.lg, gap: spacing.md },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24 },
  emptyCopy: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.72 },
});
