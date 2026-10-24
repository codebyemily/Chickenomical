import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { LinkPressable } from '@/components/link-pressable';
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
      <AppFrame active="Compare">
        <PageHeading title="Offer not found." description="This sample menu record is no longer available at this address." />
        <ActionButton kind="primary" onPress={() => router.replace('/' as never)}>Back to Compare</ActionButton>
      </AppFrame>
    );
  }

  const { location, offer } = context;
  const comparable = offer.priceCents != null && offer.pieceCount != null &&
    (offer.freshness === 'sample-recent' || offer.freshness === 'sample-stale');

  return (
    <AppFrame active="Compare">
      <PageHeading title="An offer, fully itemized." description="Inspect the menu item, price, count, location, and source behind the comparison." />
      <View style={styles.signal}>
        <Text style={styles.signalLabel}>SAMPLE PRICE / PIECE</Text>
        <Text selectable style={[styles.signalValue, tabular]}>{unitMoney(offer)}</Text>
      </View>
      <SectionHeading title={location.chain} trailing={location.displayName} />
      <View style={styles.detailRows}>
        <Fact label="MENU ITEM" value={offer.itemName} />
        <Fact label="PIECE COUNT" value={offer.pieceCount == null ? 'Not stated' : offer.pieceCount + ' pieces'} />
        <Fact label="SAMPLE PRICE" value={money(offer.priceCents)} numeric />
        <Fact label="DISTANCE" value={distanceFor(location, area).toFixed(1) + ' miles · sample straight-line estimate'} numeric />
        <Fact label="STATUS" value={freshnessText(offer)} />
        <Fact label="SAMPLE CHECK TIME" value={offer.mockChecked} />
        <Fact label="ORDERING CHANNEL" value={offer.channel} />
      </View>
      <NoticeBand title={comparable ? 'Sample source record' : 'Not comparable'}>
        Source: {offer.sourceName}. Record {offer.sourceRecordId} is an illustrative prototype identifier. It has no connected restaurant menu or external source payload.
      </NoticeBand>
      <View style={styles.actions}>
        <View style={styles.action}><ActionButton kind="primary" onPress={() => router.push('/source/' + offer.sourceRecordId as never)}>Inspect source record</ActionButton></View>
        <View style={styles.action}><ActionButton onPress={() => router.canGoBack() ? router.back() : router.replace('/' as never)}>Back to offers</ActionButton></View>
      </View>
      <HardRule />
      <LinkPressable href="/methodology" style={styles.methodAction}>
        <Text style={styles.methodLink}>Read comparison rules ↗</Text>
      </LinkPressable>
    </AppFrame>
  );
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text selectable style={[styles.factValue, numeric && tabular]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  signal: { backgroundColor: colors.yellow, borderWidth: 2, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.xl, gap: 3 },
  signalLabel: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.7 },
  signalValue: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 56, lineHeight: 68, letterSpacing: -3 },
  detailRows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, paddingHorizontal: spacing.md },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  factValue: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 170 },
  methodAction: { minHeight: 48, justifyContent: 'center' },
  methodLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
});
