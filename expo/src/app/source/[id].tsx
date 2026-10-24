import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { api, useMockConvexQuery } from '@/data/mock-convex';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { isRankable, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

export default function SourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { area } = usePrototype();
  const query = useMockConvexQuery(api.offers.bySourceItemId, { sourceItemId: id, area });
  const record = query.data;
  const offer = record?.offer;

  return (
    <AppFrame active="Explore">
      <PageHeading title="Source record." description="Inspect the provenance fields that let an offer trace back to its provider, source item, and observed time." />
      <QueryStatePanel status={query.status} error={query.error} onRetry={query.refetch} />
      {query.status === 'success' && record == null ? (
        <>
          <NoticeBand title="This source record was not found" tone="warning">The local mock query returned no offer for this source item ID.</NoticeBand>
          <ActionButton kind="primary" onPress={() => router.replace('/sources' as never)}>Back to all records</ActionButton>
        </>
      ) : null}
      {record && offer ? (
        <>
          <View style={styles.recordBanner}>
            <Text style={styles.recordLabel}>SOURCE ITEM ID</Text>
            <Text style={[styles.recordId, tabular]}>{offer.source_item_id ?? offer.id}</Text>
          </View>
          <SectionHeading title="Offer provenance" trailing="DOCUMENTED MENU SCHEMA" />
          <View style={styles.rows}>
            <Row label="Source provider" value={offer.source_provider} />
            <Row label="Menu item" value={offer.original_name} />
            <Row label="Chain" value={record.chain.name} />
            <Row label="Location" value={`${record.location.store_name} · ${record.location.address}`} />
            <Row label="Category" value={categoryLabel(offer.category)} />
            <Row label="Ordering channel" value={offer.ordering_channel} />
            <Row label="Observed at" value={formatDate(offer.observed_at)} />
            <Row label="Validation status" value={offer.validation_status} />
            <Row label="Comparable" value={offer.comparable ? 'true' : 'false'} />
            <Row label="Offer kind" value={offer.offer_kind} />
            <Row label="Quantity" value={quantityText(offer.category, offer.quantity)} />
            <Row label="List price" value={money(offer.list_price_cents, offer.currency)} />
            <Row label="Price per unit" value={isRankable(offer) ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not calculated'} />
            <Row label="Source URL" value={offer.source_url} />
            <Row label="Product key" value={offer.product_key} />
            <Row label="Offer key" value={offer.offer_key} />
          </View>
          <NoticeBand title="Synthetic source trail" tone="warning">
            The URL and provider value are illustrative. This local mock has not fetched the source and does not connect to Convex.
          </NoticeBand>
          <ActionButton onPress={() => router.push('/offer/' + offer.id as never)}>Back to menu offer</ActionButton>
        </>
      ) : null}
    </AppFrame>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not stated' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  recordBanner: { backgroundColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: 4 },
  recordLabel: { color: colors.white, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  recordId: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 28 },
  rows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  label: { flex: 1, color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  value: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
});
