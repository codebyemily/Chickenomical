import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { getOffer } from '@/data/demo';
import { distanceFor, freshnessText, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing, tabular } from '@/theme';

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { area } = usePrototype();
  const context = getOffer(id);

  if (!context) {
    return (
      <AppFrame active="Compare">
        <PageHeading title="Offer not found." description="This sample menu record may have been removed from the fixture." />
        <ActionButton kind="primary" onPress={() => router.replace('/' as never)}>Back to comparison</ActionButton>
      </AppFrame>
    );
  }

  const { location, offer } = context;
  const comparable = offer.priceCents != null && offer.pieceCount != null;

  return (
    <AppFrame active="Compare">
      <PageHeading title="Inspect this offer." description="The detail view keeps the menu item, sample price, source record, and freshness status together." />
      <View style={styles.signal}>
        <Text style={styles.signalLabel}>SAMPLE PRICE PER PIECE · NOT A LIVE MENU PRICE</Text>
        <Text style={[styles.signalValue, tabular]}>{unitMoney(offer)}</Text>
      </View>
      <SectionHeading title={location.chain} trailing={location.displayName} />
      <View style={styles.detailRows}>
        <Fact label="MENU ITEM" value={offer.itemName} />
        <Fact label="PIECE COUNT" value={offer.pieceCount == null ? 'Not stated' : offer.pieceCount + ' pieces'} />
        <Fact label="SAMPLE PICKUP TOTAL" value={money(offer.priceCents)} numeric />
        <Fact label="DISTANCE" value={distanceFor(location, area).toFixed(1) + ' miles · straight-line sample'} numeric />
        <Fact label="DATA STATUS" value={freshnessText(offer)} />
        <Fact label="SAMPLE CHECK TIME" value={offer.mockChecked} />
        <Fact label="ORDERING CHANNEL" value={offer.channel} />
      </View>
      <NoticeBand title={comparable ? 'Synthetic fixture record' : 'Not comparable'}>
        Source: {offer.sourceName}. Record {offer.sourceRecordId} is a fictional prototype identifier. Chickenomical has no live menu connection, and this screen cannot open a restaurant menu.
      </NoticeBand>
      <View style={styles.actions}>
        <View style={styles.action}><ActionButton kind="primary" onPress={() => router.push('/source/' + offer.sourceRecordId as never)}>Inspect source record</ActionButton></View>
        <View style={styles.action}><ActionButton onPress={() => router.back()}>Back to results</ActionButton></View>
      </View>
      <HardRule />
      <Pressable accessibilityRole="link" onPress={() => router.push('/methodology' as never)}>
        <Text style={styles.methodLink}>How comparisons are calculated</Text>
      </Pressable>
    </AppFrame>
  );
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={[styles.factValue, numeric && tabular]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  signal: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, padding: spacing.lg, gap: 3 },
  signalLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7 },
  signalValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 42, lineHeight: 50 },
  detailRows: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.black },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  factValue: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 170 },
  methodLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
});
