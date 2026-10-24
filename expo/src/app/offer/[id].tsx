import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { api, useMockConvexQuery } from '@/data/mock-convex';
import { categoryLabel, categoryUnit, quantityText } from '@/data/menu-schema';
import { freshnessText, isRankable, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { area } = usePrototype();
  const query = useMockConvexQuery(api.offers.byId, { id, area });
  const record = query.data;
  const offer = record?.offer;
  const rankable = offer ? isRankable(offer) : false;
  const sourceId = offer?.source_item_id ?? offer?.id ?? '';

  return (
    <AppFrame active="Offer">
      <PageHeading title="Menu offer details." description="The original menu fields, normalized category, and source trail stay together in this schema-shaped record." />
      <QueryStatePanel status={query.status} error={query.error} onRetry={query.refetch} />
      {query.status === 'success' && record == null ? (
        <>
          <NoticeBand title="This offer was not found" tone="warning">The local mock query returned no record for this offer ID.</NoticeBand>
          <ActionButton kind="primary" onPress={() => router.replace('/' as never)}>Back to comparison</ActionButton>
        </>
      ) : null}
      {record && offer ? (
        <>
          <View style={styles.signal}>
            <Text style={styles.signalLabel}>SAMPLE PRICE PER {categoryUnit(offer.category, 1).toUpperCase()}</Text>
            <Text style={rankable ? [styles.signalValue, tabular] : styles.signalUnavailable}>{rankable ? unitMoney(offer) : 'Not comparable'}</Text>
          </View>
          <SectionHeading title={record.chain.name} trailing={record.location.store_name} />
          <View style={styles.detailRows}>
            <Fact label="ORIGINAL MENU NAME" value={offer.original_name} />
            <Fact label="CATEGORY" value={categoryLabel(offer.category)} />
            <Fact label="OFFER KIND" value={offer.offer_kind.replaceAll('_', ' ')} />
            <Fact label="QUANTITY" value={quantityText(offer.category, offer.quantity)} />
            <Fact label="LIST PRICE" value={money(offer.list_price_cents, offer.currency)} numeric />
            <Fact label="UNIT PRICE" value={rankable ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not calculated'} numeric />
            <Fact label="ORDERING CHANNEL" value={offer.ordering_channel.replaceAll('_', ' ')} />
            <Fact label="PREP · HEAT" value={[offer.prep, offer.heat].filter(Boolean).join(' · ') || 'Not stated'} />
            <Fact label="BUILD · BREADING" value={[offer.build, offer.breading].filter(Boolean).join(' · ') || 'Not stated'} />
            <Fact label="INCLUDES" value={offer.includes.length ? offer.includes.join(', ') : 'None stated'} />
            <Fact label="CROW-FLIES" value={`${record.distance_miles.toFixed(1)} miles · sample estimate`} numeric />
            <Fact label="COMPARABLE" value={offer.comparable ? 'Yes' : 'No'} />
            <Fact label="VALIDATION" value={offer.validation_status} />
            <Fact label="SOURCE PROVIDER" value={offer.source_provider} />
            <Fact label="SOURCE ITEM ID" value={sourceId} />
            <Fact label="OBSERVED AT" value={formatDate(offer.observed_at)} />
            {offer.cut_mix ? <Fact label="CUT MIX" value={Object.entries(offer.cut_mix).map(([cut, count]) => `${cut}: ${count}`).join(', ')} /> : null}
            {offer.protein_pieces != null ? <Fact label="PROTEIN PIECES" value={String(offer.protein_pieces)} numeric /> : null}
            {offer.protein_category ? <Fact label="PROTEIN CATEGORY" value={categoryLabel(offer.protein_category)} /> : null}
          </View>
          {offer.components?.length ? (
            <View style={styles.components}>
              <SectionHeading title="Bundle components" trailing="PARENT PRICE STAYS INTACT" />
              {offer.components.map((component, index) => (
                <Text key={`${component.role}-${component.name ?? component.category}-${index}`} style={styles.componentLine}>
                  {component.quantity ?? '—'} × {component.name ?? categoryLabel(component.category ?? null)} · {component.role}
                </Text>
              ))}
            </View>
          ) : null}
          <NoticeBand title={offer.comparable ? freshnessText(offer) : 'Not in unit-price ranking'} tone={offer.comparable ? 'neutral' : 'warning'}>
            This is a synthetic local record. The menu source URL is represented by the mock data and does not identify a live quote.
          </NoticeBand>
          <View style={styles.actions}>
            <View style={styles.action}><ActionButton kind="primary" onPress={() => router.push('/source/' + sourceId as never)}>Open source record</ActionButton></View>
            <View style={styles.action}><ActionButton onPress={() => router.back()}>Back to results</ActionButton></View>
          </View>
          <HardRule />
          <Pressable accessibilityRole="link" onPress={() => router.push('/methodology' as never)}>
            <Text style={styles.methodLink}>Comparison rules</Text>
          </Pressable>
        </>
      ) : null}
    </AppFrame>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not stated' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={[styles.factValue, numeric && tabular]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  signal: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: 3 },
  signalLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7 },
  signalValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 42, lineHeight: 50 },
  signalUnavailable: { color: colors.black, fontFamily: fonts.bold, fontSize: 21, lineHeight: 29 },
  detailRows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, paddingHorizontal: spacing.md },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  factLabel: { flex: 1, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  factValue: { flex: 2, color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  components: { gap: spacing.sm },
  componentLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 170 },
  methodLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
});
