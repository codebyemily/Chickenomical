import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { DEMO_DATA_NOTICE, getOfferBySourceRecord } from '@/data/demo';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

export default function SourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const context = getOfferBySourceRecord(id);

  if (!context) {
    return <AppFrame active="Sources"><PageHeading title="Source record not found." /><ActionButton kind="primary" onPress={() => router.replace('/sources' as never)}>Back to Sources</ActionButton></AppFrame>;
  }

  const { offer, location } = context;
  return (
    <AppFrame active="Sources">
      <PageHeading title="Trace the source record." description="The sample provenance attached to a comparison row." />
      <View style={styles.recordBanner}><Text style={styles.recordLabel}>SAMPLE RECORD ID</Text><Text selectable style={[styles.recordId, tabular]}>{offer.sourceRecordId}</Text></View>
      <SectionHeading title="Record fields" trailing="ILLUSTRATIVE SOURCE DATA" />
      <View style={styles.rows}>
        <Row label="Source" value={offer.sourceName} />
        <Row label="Menu item" value={offer.itemName} />
        <Row label="Restaurant / store" value={location.chain + ' · ' + location.displayName} />
        <Row label="Ordering channel" value={offer.channel} />
        <Row label="Sample check time" value={offer.mockChecked} />
        <Row label="Status" value={freshnessText(offer)} />
        <Row label="Sample price" value={money(offer.priceCents)} />
        <Row label="Sample price / piece" value={unitMoney(offer)} />
      </View>
      <NoticeBand title="Illustrative source" tone="neutral">{DEMO_DATA_NOTICE} This identifier has no connected restaurant URL or provider payload.</NoticeBand>
      <ActionButton onPress={() => router.push('/offer/' + offer.id as never)}>View this offer</ActionButton>
    </AppFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  recordBanner: { backgroundColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: 4 },
  recordLabel: { color: colors.white, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  recordId: { color: colors.yellow, fontFamily: fonts.monoBold, fontSize: 28 },
  rows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  label: { flex: 1, color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16 },
  value: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
});
