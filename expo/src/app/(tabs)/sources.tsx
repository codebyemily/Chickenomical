import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { CategoryPicker } from '@/components/category-picker';
import { ChainPicker } from '@/components/chain-picker';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { api, useMockConvexQuery, type DealRecord, type OfferRecord } from '@/data/mock-convex';
import { CATEGORY_INFO, categoryLabel, categoryUnit, type MenuCategory } from '@/data/menu-schema';
import { isRankable, money, unitMoney } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

const EMPTY_OFFERS: OfferRecord[] = [];
const EMPTY_DEALS: DealRecord[] = [];

export default function SourcesScreen() {
  const router = useRouter();
  const { area, refreshStatus, refreshMessage, runMockRefresh } = usePrototype();
  const [chainId, setChainId] = useState<string | null>(null);
  const [category, setCategory] = useState<MenuCategory>('chicken-nugget');
  const offersQuery = useMockConvexQuery(api.offers.all, { area });
  const dealsQuery = useMockConvexQuery(api.deals.all, {});
  const records = offersQuery.data ?? EMPTY_OFFERS;
  const deals = dealsQuery.data ?? EMPTY_DEALS;
  const chains = useMemo(() => {
    const byId = new Map(records.map(({ chain }) => [chain.id, chain]));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);
  const visibleRecords = records.filter(({ offer, chain }) => offer.category === category && (!chainId || chain.id === chainId));
  const visibleDeals = deals.filter(({ deal, chain }) =>
    (!chainId || chain.id === chainId) && (deal.applies_to.category == null || deal.applies_to.category === category),
  );
  const loading = offersQuery.status === 'loading' || dealsQuery.status === 'loading';
  const categoryInfo = CATEGORY_INFO[category];

  function reload() {
    runMockRefresh();
    offersQuery.refetch();
    dealsQuery.refetch();
  }

  const refreshLabel = refreshStatus === 'running' ? 'Reading records…' : refreshStatus === 'failed' ? 'Retry local read' : 'Read local records again';

  return (
    <AppFrame active="Explore">
      <PageHeading title="Menu Explorer" description="Choose a chain and category to browse its location-specific menu offers and deals. Rows keep the documented menu schema fields attached." />
      <NoticeBand title="Mock Convex connection" tone="warning">
        Expo reads local fixtures through Convex-shaped query functions. This is not connected to a Convex deployment; the displayed prices, source URLs, and locations are synthetic.
      </NoticeBand>
      <NoticeBand title="Local query status" tone={refreshStatus === 'failed' ? 'error' : 'neutral'}>{refreshMessage}</NoticeBand>
      <View style={styles.refreshAction}>
        <ActionButton kind="primary" disabled={loading || refreshStatus === 'running'} onPress={reload}>{loading ? 'Reading records…' : refreshLabel}</ActionButton>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.controlLabel}>CHAIN</Text>
          <ChainPicker chains={chains} value={chainId} onChange={setChainId} />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.controlLabel}>MENU CATEGORY</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>
      </View>

      <SectionHeading title={`${categoryInfo.label} offers`} trailing={`${visibleRecords.length} MOCK RECORDS`} />
      <Text style={styles.intro}>Showing {chainId ? chains.find((chain) => chain.id === chainId)?.name ?? 'selected chain' : 'all chains'}. Offer keys, product keys, category attributes, `comparable`, and `validation_status` follow the documented menu schema.</Text>
      <QueryStatePanel
        status={offersQuery.status === 'error' ? 'error' : offersQuery.status}
        error={offersQuery.error}
        onRetry={offersQuery.refetch}
      />
      {offersQuery.status === 'success' ? (
        visibleRecords.length > 0 ? <View style={styles.recordList}>
          {visibleRecords.map(({ offer, location, chain }) => (
            <Pressable
              key={offer.id}
              accessibilityRole="link"
              onPress={() => router.push('/source/' + (offer.source_item_id ?? offer.id) as never)}
              style={({ pressed }) => [styles.recordRow, pressed && styles.pressed]}>
              <View style={styles.recordCopy}>
                <Text style={styles.recordName}>{chain.name} · {offer.original_name}</Text>
                <Text style={styles.recordMeta}>
                  {categoryLabel(offer.category)} · {location.store_name} · {offer.ordering_channel} · {offer.validation_status}
                </Text>
                <Text style={styles.recordMeta}>
                  {offer.source_provider} · {offer.source_item_id ?? offer.id} · {new Date(offer.observed_at).toLocaleString()}
                </Text>
              </View>
              <View style={styles.priceCopy}>
                <Text style={styles.price}>{money(offer.list_price_cents, offer.currency)}</Text>
                <Text style={styles.unit}>{isRankable(offer) ? `${unitMoney(offer)} / ${categoryUnit(offer.category, 1)}` : 'Not rankable'}</Text>
              </View>
            </Pressable>
          ))}
        </View> : <NoticeBand title={`No ${categoryInfo.label.toLowerCase()} offers in this view`} tone="warning">Try another chain or category. The explorer only shows records represented in this local mock.</NoticeBand>
      ) : null}

      <SectionHeading title="Deals" trailing={`${visibleDeals.length} MOCK RECORDS`} />
      <Text style={styles.intro}>Deals remain separate from list prices and keep their own conditions, schedule, receipt, and location-confirmation state.</Text>
      <QueryStatePanel
        status={dealsQuery.status === 'error' ? 'error' : dealsQuery.status}
        error={dealsQuery.error}
        onRetry={dealsQuery.refetch}
      />
      {dealsQuery.status === 'success' ? (
        visibleDeals.length > 0 ? <View style={styles.recordList}>
          {visibleDeals.map(({ deal, location, chain }) => (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.recordCopy}>
                <Text style={styles.recordName}>{chain.name} · {deal.name}</Text>
                <Text style={styles.recordMeta}>
                  {deal.deal_type.replaceAll('_', ' ')} · {categoryLabel(deal.applies_to.category ?? null)} · {location?.store_name ?? 'Chain-wide'}
                </Text>
                <Text style={styles.recordMeta}>
                  {deal.conditions.requires_app ? 'App required' : 'No app requirement'} · {deal.location_confirmed ? 'Location confirmed' : 'Location unconfirmed'}
                </Text>
              </View>
              <Text style={styles.dealPrice}>
                {deal.price_cents != null ? money(deal.price_cents) : deal.amount_off_cents != null ? `${money(deal.amount_off_cents)} off` : deal.percent_off != null ? `${deal.percent_off}% off` : 'Conditional'}
              </Text>
            </View>
          ))}
        </View> : <Text style={styles.noDeals}>No matching deals in this view.</Text>
      ) : null}
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  refreshAction: { alignSelf: 'flex-start', minWidth: 220 },
  filters: { gap: spacing.md },
  filterGroup: { gap: spacing.xs },
  controlLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.9 },
  intro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  noDeals: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  recordList: { gap: spacing.xs },
  recordRow: { width: '100%', minHeight: 72, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.62 },
  recordCopy: { flex: 1, gap: 3 },
  recordName: { color: colors.black, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  recordMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  priceCopy: { alignItems: 'flex-end' },
  price: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  unit: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
  dealCard: { width: '100%', padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  dealPrice: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, textAlign: 'right' },
});
