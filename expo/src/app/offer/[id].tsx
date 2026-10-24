import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { getOffer } from '@/data/demo';
import { distanceFor, freshnessText, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { area } = usePrototype();
  const context = getOffer(id);

  if (!context) {
    return (
      <AppFrame active="Peck">
        <PageHeading title="This offer flew the coop." description="This sample menu record may have been plucked from the fixture. That's no yolk." />
        <ActionButton kind="primary" onPress={() => router.replace('/' as never)}>Back to the pecking order</ActionButton>
      </AppFrame>
    );
  }

  const { location, offer } = context;
  const comparable = offer.priceCents != null && offer.pieceCount != null;

  return (
    <AppFrame active="Peck">
      <PageHeading title="Chick this offer out." description="Menu item, sample scratch, source record, and freshness stay in one nest so you can follow the chicken scratch." />
      <View style={styles.signal}>
        <Text style={styles.signalLabel}>SAMPLE PRICE PER PECK · NOT A LIVE BIRD</Text>
        <Text style={[styles.signalValue, tabular]}>{unitMoney(offer)}</Text>
      </View>
      <SectionHeading title={location.chain} trailing={location.displayName} />
      <View style={styles.detailRows}>
        <Fact label="MENU ITEM" value={offer.itemName} />
        <Fact label="PECK COUNT" value={offer.pieceCount == null ? 'Not hatched' : offer.pieceCount + ' pieces'} />
        <Fact label="SAMPLE SCRATCH" value={money(offer.priceCents)} numeric />
        <Fact label="CROW-FLIES" value={distanceFor(location, area).toFixed(1) + ' miles · as the crow flies'} numeric />
        <Fact label="FLOCK STATUS" value={freshnessText(offer)} />
        <Fact label="SAMPLE PERCH CHECK" value={offer.mockChecked} />
        <Fact label="ORDERING CHANNEL" value={offer.channel} />
      </View>
      <NoticeBand title={comparable ? 'Synthetic nest egg' : 'Not in the pecking order'}>
        Source: {offer.sourceName}. Record {offer.sourceRecordId} is a fictional prototype identifier. Chickenomical has no live coop, and this screen cannot open a restaurant menu. That&apos;s no yolk.
      </NoticeBand>
      <View style={styles.actions}>
        <View style={styles.action}><ActionButton kind="primary" onPress={() => router.push('/source/' + offer.sourceRecordId as never)}>Follow the chicken scratch</ActionButton></View>
        <View style={styles.action}><ActionButton onPress={() => router.back()}>Back to the flock</ActionButton></View>
      </View>
      <HardRule />
      <Pressable accessibilityRole="link" onPress={() => router.push('/methodology' as never)}>
        <Text style={styles.methodLink}>Rules of the roost</Text>
      </Pressable>
    </AppFrame>
  );
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={[styles.factValue, numeric && tabular]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  signal: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: 3 },
  signalLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7 },
  signalValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 42, lineHeight: 50 },
  detailRows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, paddingHorizontal: spacing.md },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  factValue: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 170 },
  methodLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
});
