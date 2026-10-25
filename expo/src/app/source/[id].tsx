import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, SectionHeading } from '@/components/app-frame';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryUnit } from '@/data/menu-schema';
import { isRankable, money, unitMoney } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

const EMPTY_RECORDS: OfferRecord[] = [];

export default function SourceDetailScreen() {
  const { id: routeId, jobId: routeJobId } = useLocalSearchParams<{ id?: string | string[]; jobId?: string | string[] }>();
  const router = useRouter();
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
  const foundIn = boardRecord ? 'board' : recentRecord ? 'recent' : undefined;
  const offer = record?.offer;
  const sourceItemId = offer?.source_item_id?.trim() || offer?.id || '';
  const boardJobId = boardRecord && boardQuery.status === 'success'
    ? requestedJobId ?? boardQuery.metadata.job?._id
    : undefined;
  const boardSettled = boardQuery.status !== 'loading';
  const recentSettled = recentQuery.status !== 'loading';
  const recentFallbackEnabled = !requestedJobId;
  const notFound = boardSettled && (!recentFallbackEnabled || recentSettled) && !record;
  const lookupScope = requestedJobId
    ? `No row matched ${normalizedId} in this scrape job.`
    : boardQuery.status === 'error'
      ? `No row matched ${normalizedId} in the 200 most recently stored menu offers. The current board lookup failed.`
      : recentQuery.status === 'error'
        ? `No row matched ${normalizedId} in the current board. The recent stored-record lookup failed.`
        : `No row matched ${normalizedId} in the current board or the 200 most recently stored menu offers.`;

  async function openSourceUrl() {
    if (!offer?.source_url) return;
    try {
      await Linking.openURL(offer.source_url);
    } catch {
      Alert.alert('Could not open source', 'The stored source URL could not be opened on this device.');
    }
  }

  return (
    <AppFrame active="Explore">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>CHICKENOMICAL · SOURCE CHECK</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>Follow the record to its source.</Text>
          <Text style={styles.heroDescription}>Review the menu row, stored chain and location IDs, and the provider link used to capture it.</Text>
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
            {boardQuery.error.message}{recentQuery.status === 'success' ? ' The stored record lookup below can still resolve older menu rows.' : ''}
          </NoticeBand>
        ) : null}
        {recentFallbackEnabled && recentQuery.status === 'error' && !boardRecord ? (
          <NoticeBand title="Stored record lookup failed" tone="error">
            {recentQuery.error.message}
          </NoticeBand>
        ) : null}
        {notFound ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching source record was returned.</Text>
            <Text style={styles.emptyCopy}>
              {normalizedId ? lookupScope : 'This route does not include a source record ID.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/sources' as never)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Back to source records</Text>
            </Pressable>
          </View>
        ) : null}

        {record && offer ? (
          <>
            <View style={styles.sourceCard}>
              <View style={styles.sourceCardTop}>
                <View style={styles.sourceCopy}>
                  <Text style={styles.sourceLabel}>SOURCE ITEM ID</Text>
                  <Text selectable style={[styles.sourceId, tabular]}>{sourceItemId}</Text>
                </View>
                <View style={[styles.originPill, foundIn === 'board' ? styles.originPillBoard : styles.originPillStored]}>
                  <Text style={styles.originPillText}>{foundIn === 'board' ? 'BOARD' : 'STORED'}</Text>
                </View>
              </View>
              <Text style={styles.originNote}>
                {foundIn === 'board'
                  ? requestedJobId ? 'Returned by the requested scrape job.' : 'Returned by the current offers board query.'
                  : 'Resolved from recent stored menuOffers; it may be from an older scrape than the current board.'}
              </Text>
            </View>

            {recentFallbackEnabled && recentQuery.status === 'error' && boardRecord ? (
              <NoticeBand title="Recent stored lookup is unavailable" tone="warning">
                The matching row came from the board query. Older stored rows could not be checked.
              </NoticeBand>
            ) : null}

            <SectionHeading title="Menu offer" trailing="VALUES FROM CONVEX" />
            <View style={styles.featureCard}>
              <Text style={styles.featureEyebrow}>AS STORED</Text>
              <Text style={styles.offerName}>{offer.original_name}</Text>
              <Text style={styles.chainLine}>Chain ID · {offer.chain_id}</Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>LIST PRICE</Text>
                  <Text style={[styles.price, tabular]}>{money(offer.list_price_cents, offer.currency)}</Text>
                </View>
                <View style={styles.priceUnitBlock}>
                  <Text style={styles.priceLabel}>PER UNIT</Text>
                  <Text style={[styles.priceUnit, tabular]}>
                    {isRankable(offer) ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not calculated'}
                  </Text>
                </View>
              </View>
            </View>

            <SectionHeading title="Stored fields" trailing="RAW DATABASE VALUES" />
            <View style={styles.fieldGroup}>
              <Text style={styles.groupTitle}>Source and record keys</Text>
              <FieldRow label="Source provider" value={offer.source_provider} />
              <FieldRow label="Source item ID" value={offer.source_item_id} />
              <FieldRow label="Document ID" value={offer.id} />
              <FieldRow label="Offer key" value={offer.offer_key} />
              <FieldRow label="Product key" value={offer.product_key} />
              <FieldRow label="Source URL" value={offer.source_url} link onPress={openSourceUrl} />
            </View>

            <View style={[styles.fieldGroup, styles.fieldGroupSky]}>
              <Text style={styles.groupTitle}>Chain and location</Text>
              <FieldRow label="Chain ID" value={offer.chain_id} />
              <FieldRow label="Location ID" value={offer.location_id} />
              <FieldRow label="Store name" value={record.location.store_name} />
              <FieldRow label="Address" value={record.location.address} />
              <FieldRow label="Latitude" value={record.location.latitude} />
              <FieldRow label="Longitude" value={record.location.longitude} />
              <FieldRow label="Stored distance (miles)" value={record.distance_miles} />
            </View>

            <View style={[styles.fieldGroup, styles.fieldGroupWhite]}>
              <Text style={styles.groupTitle}>Offer details</Text>
              <FieldRow label="Category" value={offer.category} />
              <FieldRow label="Offer kind" value={offer.offer_kind} />
              <FieldRow label="Quantity" value={offer.quantity} />
              <FieldRow label="Quantity label" value={offer.quantity_label} />
              <FieldRow label="List price (cents)" value={offer.list_price_cents} />
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
              <Text style={styles.groupTitle}>Capture and review</Text>
              <FieldRow label="Ordering channel" value={offer.ordering_channel} />
              <FieldRow label="Observed at" value={offer.observed_at} date />
              <FieldRow label="Validation status" value={offer.validation_status} />
              <FieldRow label="Comparable" value={offer.comparable} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(offerDetailRoute(String(offer.id), boardJobId) as never)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Open menu offer →</Text>
            </Pressable>
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
      <Text style={styles.loadingText}>Looking up this Convex menu record…</Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  date = false,
  link = false,
  onPress,
}: {
  label: string;
  value: unknown;
  date?: boolean;
  link?: boolean;
  onPress?: () => void;
}) {
  const display = formatValue(value, date);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {link && onPress && value ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`Open source URL ${display}`} onPress={onPress} style={({ pressed }) => [styles.fieldValueLink, pressed && styles.pressed]}>
          <Text selectable style={styles.fieldValueLinkText}>{display}</Text>
        </Pressable>
      ) : (
        <Text selectable style={styles.fieldValue}>{display}</Text>
      )}
    </View>
  );
}

function formatValue(value: unknown, date: boolean) {
  if (value == null || value === '') return 'Not stated';
  if (date && typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return `${value} · ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)}`;
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None recorded';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: spacing.lg },
  hero: { backgroundColor: colors.orange, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, marginHorizontal: -spacing.lg, marginTop: -spacing.xl, gap: spacing.sm, overflow: 'hidden' },
  heroEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
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
  featureEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
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
  primaryButton: { minHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.coral, borderRadius: radii.pill },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 17 },
  emptyCard: { padding: spacing.lg, backgroundColor: colors.sky, borderRadius: radii.lg, gap: spacing.md },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24 },
  emptyCopy: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.72 },
});
