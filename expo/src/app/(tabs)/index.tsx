import { Button as ExpoButton, Collapsible, Column as ExpoColumn, Host, Row as ExpoRow, Text as ExpoText } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading } from '@/components/app-frame';
import { CategoryPicker } from '@/components/category-picker';
import { ChainComparisonMatrix } from '@/components/chain-comparison-matrix';
import { QueryStatePanel } from '@/components/query-state-panel';
import { api, useMockConvexQuery } from '@/data/mock-convex';
import { CATEGORY_INFO } from '@/data/menu-schema';
import { comparisonMatrixGroups, exclusionText, isRankable } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

export default function CompareScreen() {
  const router = useRouter();
  const { category, setCategory, area, locationLabel, radiusMiles } = usePrototype();
  const [showExcluded, setShowExcluded] = useState(false);
  const query = useMockConvexQuery(api.offers.nearby, { category, area, radiusMiles });
  const records = query.data ?? [];
  const matrixGroups = comparisonMatrixGroups(records, category).filter((group) =>
    new Set(group.records.map(({ chain }) => chain.id)).size > 1,
  );
  const excluded = records.filter(({ offer }) => !isRankable(offer));
  const chainCount = new Set(matrixGroups.flatMap((group) => group.records.map(({ chain }) => chain.id))).size;
  const categoryInfo = CATEGORY_INFO[category];

  return (
    <AppFrame active="Compare" compact>
      <View style={styles.content}>
        <PageHeading title="Chicken prices" compact />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/location' as never)}
          style={({ pressed }) => [styles.locationBand, Platform.OS !== 'web' && styles.locationBandNative, pressed && styles.pressed]}>
          <View style={styles.locationCopy}>
            <Text numberOfLines={1} style={styles.locationName}>{locationLabel}</Text>
            <Text style={styles.locationHint}>{radiusMiles} mi radius</Text>
          </View>
          <Text style={styles.changeLink}>Change</Text>
        </Pressable>

        <View style={styles.filterGroup}>
          <Text style={styles.controlLabel}>CATEGORY</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>

        <QueryStatePanel status={query.status} error={query.error} onRetry={query.refetch} />

        {query.status === 'success' ? (
          <View style={styles.matrixSection}>
            <View style={styles.matrixHeading}>
              <Text style={styles.matrixTitle}>{categoryInfo.label}</Text>
              <Text style={styles.matrixMeta}>
                PER {categoryInfo.unit.toUpperCase()}{chainCount > 0 ? ` · ${chainCount} CHAINS` : ''}
              </Text>
            </View>
            {matrixGroups.length > 0 ? matrixGroups.map((group) => (
              <View key={group.key} style={styles.matrixGroup}>
                <Text style={styles.variant} numberOfLines={2}>{group.label}</Text>
                <ChainComparisonMatrix group={group} category={category} />
              </View>
            )) : (
              <NoticeBand title="No matching chain prices here yet" tone="warning">
                Try a wider radius or another category.
              </NoticeBand>
            )}
          </View>
        ) : null}

        {query.status === 'success' && excluded.length > 0 ? (
          <Host matchContents style={styles.excludedHost}>
            <Collapsible
              isOpen={showExcluded}
              onOpenChange={setShowExcluded}
              label={`Not compared · ${excluded.length}`}
              labelStyle={styles.excludedSummaryText}>
              <ExpoColumn style={{ width: '100%' }} spacing={6}>
                {excluded.map((record) => (
                  <ExpoRow key={record.offer.id} alignment="center" style={{ width: '100%' }} spacing={8}>
                    <ExpoColumn style={{ width: '78%' }} spacing={2}>
                      <ExpoText numberOfLines={1} textStyle={styles.excludedName}>{`${record.chain.name} · ${record.offer.original_name}`}</ExpoText>
                      <ExpoText numberOfLines={2} textStyle={styles.excludedMeta}>{exclusionText(record.offer)}</ExpoText>
                    </ExpoColumn>
                    <ExpoButton
                      variant="text"
                      onPress={() => router.push(`/offer/${record.offer.id}` as never)}>
                      <ExpoText textStyle={styles.inspectText}>View</ExpoText>
                    </ExpoButton>
                  </ExpoRow>
                ))}
              </ExpoColumn>
            </Collapsible>
          </Host>
        ) : null}
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', gap: spacing.md },
  locationBand: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  locationBandNative: { paddingVertical: 6 },
  locationCopy: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  controlLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.65 },
  locationName: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  locationHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  changeLink: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, textDecorationLine: 'underline' },
  pressed: { opacity: 0.76 },
  filterGroup: { gap: 2 },
  matrixSection: { gap: spacing.sm },
  matrixHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.black },
  matrixTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  matrixMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, letterSpacing: 0.2 },
  matrixGroup: { gap: 4 },
  variant: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  excludedHost: { width: '100%' },
  excludedSummaryText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  excludedName: { color: colors.black, fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  excludedMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9, lineHeight: 12 },
  inspectText: { color: colors.black, fontFamily: fonts.bold, fontSize: 10 },
});
