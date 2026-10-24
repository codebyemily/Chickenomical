import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { OfferRecord } from '@/data/mock-convex';
import { categoryUnit, quantityText } from '@/data/menu-schema';
import type { MenuCategory } from '@/data/menu-schema';
import type { ComparisonMatrixGroup } from '@/lib/compare';
import { money, unitMoney, unitPrice } from '@/lib/compare';
import { colors, fonts, spacing, tabular } from '@/theme';

const LABEL_COLUMN_WIDTH = 66;
const CHAIN_COLUMN_WIDTH = 146;
const HEADER_HEIGHT = 42;
const OFFER_HEIGHT = 46;

type ChainColumn = { id: string; name: string };
type MatrixCell = { record: OfferRecord; otherCount: number };
type MatrixRow = {
  quantity: number;
  cheapestId?: string;
  cells: Map<string, MatrixCell>;
};

export function ChainComparisonMatrix({ group, category }: { group: ComparisonMatrixGroup; category: MenuCategory }) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const chains = getChains(group.records);
  const preferredTableWidth = LABEL_COLUMN_WIDTH + CHAIN_COLUMN_WIDTH * chains.length;
  const pagePadding = windowWidth >= 900 ? spacing.xxxl * 2 : spacing.lg * 2;
  const availableWidth = Math.min(1360, windowWidth - pagePadding);
  const tableWidth = Math.min(availableWidth, preferredTableWidth);
  const quantities = [...new Set(group.records.map(({ offer }) => offer.quantity!))].sort((a, b) => a - b);
  const rows: MatrixRow[] = quantities.map((quantity) => {
    const groupedOffers = new Map<string, OfferRecord[]>();
    const rowRecords = group.records.filter(({ offer }) => offer.quantity === quantity);
    for (const record of rowRecords) {
      const offers = groupedOffers.get(record.chain.id) ?? [];
      offers.push(record);
      groupedOffers.set(record.chain.id, offers);
    }

    const cells = new Map<string, MatrixCell>();
    for (const [chainId, offers] of groupedOffers) {
      const sortedOffers = [...offers].sort((a, b) =>
        unitPrice(a.offer)! - unitPrice(b.offer)! ||
        a.offer.list_price_cents! - b.offer.list_price_cents! ||
        a.distance_miles - b.distance_miles,
      );
      cells.set(chainId, { record: sortedOffers[0], otherCount: sortedOffers.length - 1 });
    }
    const cheapest = cells.size > 1
      ? [...cells.values()].reduce((best, cell) =>
        unitPrice(cell.record.offer)! < unitPrice(best.record.offer)! ? cell : best,
      [...cells.values()][0])
      : undefined;

    return {
      quantity,
      cheapestId: cheapest?.record.offer.id,
      cells,
    };
  });

  return (
    <View style={styles.matrixViewport}>
      <View style={[styles.table, { width: tableWidth }]}>
        <View style={styles.fixedColumn}>
          <View style={[styles.quantityHeader, styles.ruleBottom]}>
            <Text style={styles.headerLabel}>SIZE</Text>
            <Text style={styles.headerHint}>{categoryUnit(category, 2).toUpperCase()}</Text>
          </View>
          {rows.map((row) => (
            <View key={row.quantity} style={[styles.quantityCell, styles.ruleBottom]}>
              <Text style={[styles.quantity, tabular]}>{quantityText(category, row.quantity)}</Text>
            </View>
          ))}
        </View>
        <ScrollView
          horizontal
          style={[styles.chainScroll, { width: tableWidth - LABEL_COLUMN_WIDTH }]}
          contentContainerStyle={styles.chainColumns}
          showsHorizontalScrollIndicator
          directionalLockEnabled>
          {chains.map((chain) => (
            <View key={chain.id} style={[styles.chainColumn, { width: CHAIN_COLUMN_WIDTH }]}>
              <View style={[styles.chainHeader, styles.ruleBottom]}>
                <Text numberOfLines={1} style={styles.chainName}>{chain.name}</Text>
              </View>
              {rows.map((row) => {
                const cell = row.cells.get(chain.id);
                const record = cell?.record;
                const isCheapest = record?.offer.id === row.cheapestId;
                if (!record || !cell) {
                  return (
                    <View key={row.quantity} style={[styles.chainCell, styles.ruleBottom]}>
                      <Text style={styles.dash}>—</Text>
                    </View>
                  );
                }

                const nearbyCount = cell.otherCount + 1;
                const accessibilityLabel = `${chain.name}, ${record.offer.original_name}, ${quantityText(category, record.offer.quantity)}, ${unitMoney(record.offer)} per ${categoryUnit(category, 1)}, ${money(record.offer.list_price_cents, record.offer.currency)} total, best nearby unit price of ${nearbyCount} matching ${nearbyCount === 1 ? 'offer' : 'offers'}, ${record.location.store_name}${isCheapest ? ', lowest price per unit among chains for this size' : ''}`;

                return (
                  <Pressable
                    key={row.quantity}
                    accessibilityRole="link"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint="Opens the menu offer details."
                    onPress={() => router.push(`/offer/${record.offer.id}` as never)}
                    style={({ pressed }) => [
                      styles.chainCell,
                      isCheapest && styles.bestOffer,
                      pressed && styles.pressed,
                      styles.ruleBottom,
                    ]}>
                    <View style={styles.priceLine}>
                      <Text style={[styles.unitPrice, isCheapest && styles.bestPrice, tabular]} numberOfLines={1}>
                        {unitMoney(record.offer)} / {categoryUnit(category, 1)}
                      </Text>
                      {isCheapest ? <Text style={styles.bestTag}>LOW</Text> : null}
                    </View>
                    <Text numberOfLines={1} style={[styles.totalPrice, tabular]}>
                      {money(record.offer.list_price_cents, record.offer.currency)} total
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function getChains(records: OfferRecord[]): ChainColumn[] {
  const chains = new Map<string, ChainColumn>();
  for (const { chain } of records) chains.set(chain.id, { id: chain.id, name: chain.name });
  return [...chains.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const styles = StyleSheet.create({
  matrixViewport: { width: '100%', alignItems: 'center' },
  table: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.rule, borderBottomWidth: 1, borderBottomColor: colors.rule },
  fixedColumn: { width: LABEL_COLUMN_WIDTH, flexShrink: 0, alignItems: 'center', backgroundColor: colors.gray },
  quantityHeader: { height: HEADER_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs, gap: 2 },
  headerLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.55 },
  headerHint: { color: colors.muted, fontFamily: fonts.medium, fontSize: 7, letterSpacing: 0.15 },
  quantityCell: { height: OFFER_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs },
  quantity: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, textAlign: 'center' },
  chainScroll: { minWidth: 0, flexShrink: 0 },
  chainColumns: { flexDirection: 'row' },
  chainColumn: { borderLeftWidth: 1, borderLeftColor: colors.rule },
  chainHeader: { height: HEADER_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs, backgroundColor: colors.gray },
  chainName: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  chainCell: { height: OFFER_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs, gap: 1, backgroundColor: colors.white },
  bestOffer: { backgroundColor: '#FFF4BC' },
  priceLine: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bestPrice: { color: '#704000' },
  bestTag: { color: '#704000', fontFamily: fonts.bold, fontSize: 7, letterSpacing: 0.3 },
  unitPrice: { flexShrink: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  totalPrice: { color: colors.muted, fontFamily: fonts.regular, fontSize: 8, lineHeight: 10, textAlign: 'center' },
  dash: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' },
  ruleBottom: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  pressed: { opacity: 0.66 },
});
