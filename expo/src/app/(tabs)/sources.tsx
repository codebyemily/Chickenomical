import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { DEMO_LOCATIONS } from '@/data/demo';
import { freshnessText, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing } from '@/theme';

export default function SourcesScreen() {
  const router = useRouter();
  const { refreshStatus, refreshMessage, runMockRefresh } = usePrototype();
  const offers = DEMO_LOCATIONS.flatMap((location) => location.offers.map((offer) => ({ location, offer })));
  const label = refreshStatus === 'running' ? 'Simulating…' : refreshStatus === 'failed' ? 'Retry sample refresh' : 'Simulate sample refresh';

  return (
    <AppFrame active="Data sources">
      <PageHeading title="Data source ledger." description="Review where comparison fields would come from and how incomplete or aging records are handled." />
      <NoticeBand title="Source connection status" tone={refreshStatus === 'failed' ? 'error' : 'neutral'}>{refreshMessage}</NoticeBand>
      <View style={styles.refreshAction}><ActionButton kind="primary" disabled={refreshStatus === 'running'} onPress={() => runMockRefresh()}>{label}</ActionButton></View>
      <NoticeBand title="Current build: local fixture only" tone="warning">
        No restaurant menus, provider API, or database are connected. Refresh only changes this message; fixture content stays unchanged.
      </NoticeBand>
      <SectionHeading title="Sample records" trailing={offers.length + ' LOCAL ROWS'} />
      <Text style={styles.intro}>Every visible price, check time, and identifier below is fictional. Select a row to inspect its traceability fields.</Text>
      <View style={styles.recordList}>
        {offers.map(({ location, offer }) => (
          <Pressable key={offer.id} accessibilityRole="link" onPress={() => router.push('/source/' + offer.sourceRecordId as never)} style={({ pressed }) => [styles.recordRow, pressed && styles.pressed]}>
            <View style={styles.recordCopy}>
              <Text style={styles.recordName}>{location.chain} · {offer.itemName}</Text>
              <Text style={styles.recordMeta}>{offer.sourceRecordId} · {freshnessText(offer)}</Text>
            </View>
            <View style={styles.priceCopy}><Text style={styles.price}>{money(offer.priceCents)}</Text><Text style={styles.unit}>{unitMoney(offer)} / piece</Text></View>
          </Pressable>
        ))}
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  refreshAction: { alignSelf: 'flex-start', minWidth: 220 },
  intro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  recordList: { borderTopWidth: 1, borderTopColor: colors.black, gap: 0 },
  recordRow: { width: '100%', minHeight: 72, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.62 },
  recordCopy: { flex: 1, gap: 3 },
  recordName: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  recordMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  priceCopy: { alignItems: 'flex-end' },
  price: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  unit: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
});
