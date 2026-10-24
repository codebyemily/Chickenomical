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
    return <AppFrame active="Coop"><PageHeading title="This scratch pad flew the coop." /><ActionButton kind="primary" onPress={() => router.replace('/sources' as never)}>Back to the coop</ActionButton></AppFrame>;
  }

  const { offer, location } = context;
  return (
    <AppFrame active="Coop">
      <PageHeading title="Chicken scratch." description="A traceability view for the record perched on a comparison row. Follow every nugget of provenance." />
      <View style={styles.recordBanner}><Text style={styles.recordLabel}>SAMPLE CLUTCH ID</Text><Text style={[styles.recordId, tabular]}>{offer.sourceRecordId}</Text></View>
      <SectionHeading title="Clutch fields" trailing="FICTIONAL CHICKEN SCRATCH" />
      <View style={styles.rows}>
        <Row label="Source nest" value={offer.sourceName} />
        <Row label="Menu item" value={offer.itemName} />
        <Row label="Roost" value={location.chain + ' · ' + location.displayName} />
        <Row label="Ordering channel" value={offer.channel} />
        <Row label="Sample perch check" value={offer.mockChecked} />
        <Row label="Flock status" value={freshnessText(offer)} />
        <Row label="Sample scratch" value={money(offer.priceCents)} />
        <Row label="Sample price per peck" value={unitMoney(offer)} />
      </View>
      <NoticeBand title="No external coop is connected" tone="warning">{DEMO_DATA_NOTICE} This prototype has no restaurant URL, menu fetch, database record, or provider payload behind this identifier. The trail went cold as a leftover drumstick.</NoticeBand>
      <ActionButton onPress={() => router.push('/offer/' + offer.id as never)}>Back to this bird</ActionButton>
    </AppFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
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
