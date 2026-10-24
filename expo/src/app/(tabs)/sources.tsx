import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { LinkPressable } from '@/components/link-pressable';
import { ActionButton } from '@/components/ui/action-button';
import { DEMO_LOCATIONS } from '@/data/demo';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

export default function SourcesScreen() {
  const { refreshStatus, refreshMessage, runMockRefresh } = usePrototype();
  const offers = DEMO_LOCATIONS.flatMap((location) => location.offers.map((offer) => ({ location, offer })));
  const label = refreshStatus === 'running' ? 'Refreshing…' : refreshStatus === 'failed' ? 'Retry refresh' : 'Simulate a refresh';

  return (
    <AppFrame active="Sources">
      <PageHeading title="Every price has a source." description="Review sample records, their check times, and the status behind each comparison." />
      <NoticeBand title="Connection status" tone={refreshStatus === 'failed' ? 'error' : 'neutral'}>{refreshMessage}</NoticeBand>
      <View style={styles.refreshAction}><ActionButton kind="primary" disabled={refreshStatus === 'running'} onPress={() => runMockRefresh()}>{label}</ActionButton></View>
      <NoticeBand title="Local prototype data" tone="neutral">
        These are illustrative source records. Refresh simulates a local status update; sample prices and check times stay the same.
      </NoticeBand>
      <SectionHeading title="Source ledger" trailing={offers.length + ' SAMPLE RECORDS'} />
      <Text style={styles.intro}>Select a record to inspect the original menu item, price, status, and sample identifier.</Text>
      <View style={styles.recordList}>
        {offers.map(({ location, offer }) => (
          <LinkPressable key={offer.id} href={{ pathname: '/source/[id]', params: { id: offer.sourceRecordId } }} style={({ pressed }) => [styles.recordRow, pressed && styles.pressed]}>
            <View style={styles.recordCopy}>
              <Text style={styles.recordName}>{location.chain} · {offer.itemName}</Text>
              <Text style={styles.recordMeta}>{offer.sourceRecordId} · {freshnessText(offer)}</Text>
            </View>
            <View style={styles.priceCopy}><Text selectable style={styles.price}>{money(offer.priceCents)}</Text><Text style={styles.unit}>{unitMoney(offer)} / pc</Text></View>
          </LinkPressable>
        ))}
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  refreshAction: { alignSelf: 'flex-start', minWidth: 220 },
  intro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  recordList: { borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.white },
  recordRow: { width: '100%', minHeight: 76, padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.62 },
  recordCopy: { flex: 1, gap: 3 },
  recordName: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  recordMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  priceCopy: { alignItems: 'flex-end' },
  price: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 15 },
  unit: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
});
