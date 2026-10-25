import { Host, Slider } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand } from '@/components/app-frame';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { FormField } from '@/components/form-field';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { categoryInfo, categoryUnit, quantityText } from '@/data/menu-schema';
import { isRankable, money, solveAllLocations } from '@/lib/compare';
import { offerDetailRoute } from '@/lib/live-offer-routes';
import { usePrototype } from '@/state/prototype-context';
import { pageMetadata } from '@/data/page-metadata';
import { colors, fonts, spacing, tabular } from '@/theme';
import type { GenerateMetadataFunction } from 'expo-router/server';

const EMPTY_RECORDS: OfferRecord[] = [];

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Plan a group chicken order',
  'Estimate the lowest recent menu total for feeding a group at one nearby restaurant.',
);

export default function QuantityScreen() {
  const { category, setCategory, radiusMiles, groupSize, setGroupSize } = usePrototype();
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const goal = goalDraft ?? String(groupSize);
  const query = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();
  const boardRows = query.status === 'success' ? query.data : EMPTY_RECORDS;
  const boardCategories = useMemo(() => [...new Set(
    boardRows.flatMap(({ offer }) => offer.category ? [offer.category] : []),
  )].sort((a, b) => categoryInfo(a).label.localeCompare(categoryInfo(b).label)), [boardRows]);
  const selectedCategory = boardCategories.includes(category) ? category : boardCategories[0] ?? null;
  const recentRows = recentQuery.status === 'success' ? recentQuery.data : EMPTY_RECORDS;
  const recentChainCount = new Set(recentRows.map(({ chain }) => chain.id)).size;
  const recentCategoryCount = new Set(recentRows.flatMap(({ offer }) => offer.category ? [offer.category] : [])).size;
  const records = query.status === 'success'
    ? query.data.filter(({ distance_miles }) => distance_miles != null && distance_miles <= radiusMiles)
    : EMPTY_RECORDS;
  const boardChainCount = query.status === 'success'
    ? new Set(query.data.map(({ chain }) => chain.id)).size
    : 0;
  const categoryRecords = selectedCategory
    ? records.filter(({ offer }) => offer.category === selectedCategory)
    : [];
  const eligibleCount = categoryRecords.filter(({ offer }) => isRankable(offer)).length;
  const selectedCategoryInfo = selectedCategory
    ? categoryInfo(selectedCategory)
    : { label: 'available category', unit: 'item', plural: 'items' };
  const solutions = selectedCategory ? solveAllLocations(records, selectedCategory, groupSize) : [];
  const byVariant = new Map<string, typeof solutions>();
  for (const solution of solutions) {
    const rows = byVariant.get(solution.variantKey) ?? [];
    rows.push(solution);
    byVariant.set(solution.variantKey, rows);
  }
  const solutionGroups = [...byVariant].map(([key, rows]) => ({ key, variant: rows[0].variant, rows }));
  const solutionLocationCount = new Set(solutions.map((solution) => solution.location.id)).size;
  const best = solutions[0];
  const hasUnappliedGoal = goal.trim() !== String(groupSize);
  const bestPlanKey = best
    ? `${best.location.id}:${best.orders.map(({ offer, quantity }) => `${offer.id}x${quantity}`).join(',')}`
    : 'no-solution';
  const previousPlan = useRef(bestPlanKey);
  const lastHapticAt = useRef(0);

  useEffect(() => {
    if (query.status !== 'success' || boardCategories.length === 0 || boardCategories.includes(category)) return;
    setCategory(boardCategories[0]);
  }, [boardCategories, category, query.status, setCategory]);

  useEffect(() => {
    if (query.status !== 'success') return;
    if (previousPlan.current === bestPlanKey) return;
    previousPlan.current = bestPlanKey;
    if (Platform.OS === 'web') return;

    const timeout = setTimeout(() => {
      const now = Date.now();
      if (now - lastHapticAt.current < 220) return;
      lastHapticAt.current = now;
      if (Platform.OS === 'ios') void Haptics.selectionAsync();
      if (Platform.OS === 'android') void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
    }, 100);

    return () => clearTimeout(timeout);
  }, [bestPlanKey, query.status]);

  function commitGoal(nextGoal: string) {
    const normalized = nextGoal.trim();
    const count = Number.parseInt(normalized, 10);
    if (!/^[0-9]+$/.test(normalized) || !Number.isFinite(count) || count < 1 || count > 100) {
      setGoalError(`Enter a whole number from 1 to 100 ${selectedCategoryInfo.plural}. Don't count your chickens past 100.`);
      return false;
    }
    setGoalError(null);
    setGoalDraft(null);
    setGroupSize(count);
    return true;
  }

  function changeFromSlider(value: number) {
    const next = Math.min(100, Math.max(1, Math.round(value)));
    setGoalDraft(null);
    setGroupSize(next);
    setGoalError(null);
  }

  function changeFromText(value: string) {
    setGoalDraft(value);
    setGoalError(null);
  }

  return (
    <AppFrame active="Group" compact surface="compare">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Chickenomical</Text>
          <HeadingText level={1} style={styles.heroTitle}>How many are we feeding?</HeadingText>
          <Text style={styles.heroDescription}>Build a chicken order from recent pickup prices nearby.</Text>
        </View>

        <View style={styles.inner}>
          <View style={styles.goalPanel}>
            <View style={styles.categoryBlock}>
              <Text style={styles.controlLabel}>CHOOSE YOUR CHICKEN</Text>
              {boardCategories.length > 0 ? (
                <View style={styles.categoryOptions}>
                  {boardCategories.map((option) => {
                    const selected = option === selectedCategory;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        aria-pressed={selected}
                        onPress={() => setCategory(option)}
                        style={({ pressed }) => [styles.categoryChip, selected && styles.categoryChipSelected, pressed && styles.pressed]}>
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{categoryInfo(option).label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noCategories}>
                  {query.status === 'loading'
                    ? 'Loading categories from Convex…'
                    : query.status === 'error'
                      ? 'Categories are unavailable while Convex is offline.'
                      : 'This board has no classified categories yet.'}
                </Text>
              )}
            </View>

            <View style={styles.goalReadout}>
              <View>
                <Text style={styles.controlLabel}>MINIMUM ORDER SIZE</Text>
                <View style={styles.goalValueLine}>
                  <Text accessibilityLiveRegion="polite" style={[styles.goalValue, tabular]}>{groupSize}</Text>
                  <Text style={styles.goalUnit}>{categoryUnit(selectedCategory, groupSize)}</Text>
                </View>
              </View>
              <View style={styles.rangeBadge}>
                <Text style={styles.rangeText}>1–100</Text>
              </View>
            </View>

            <View style={styles.sliderBlock}>
              <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={colors.purple} style={styles.sliderHost}>
                <Slider
                  value={groupSize}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={changeFromSlider}
                  testID="piece-goal-slider"
                />
              </Host>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1 {categoryUnit(selectedCategory, 1)}</Text>
                <Text style={styles.sliderLabel}>100 {selectedCategoryInfo.plural}</Text>
              </View>
            </View>

            <View style={styles.exactEntry}>
              <Text style={styles.controlLabel}>OR SET AN EXACT SIZE</Text>
              <View style={styles.exactEntryRow}>
              <FormField
                label={`${selectedCategoryInfo.unit} goal`}
                value={goal}
                onChangeText={changeFromText}
                keyboardType="numeric"
                submitLabel="done"
                onSubmitEditing={() => commitGoal(goal)}
                onBlur={() => commitGoal(goal)}
                help="Enter a whole number from 1 to 100."
                error={goalError ?? undefined}
              />
              <ActionButton kind="primary" onPress={() => commitGoal(goal)}>Apply size</ActionButton>
              </View>
              {hasUnappliedGoal && !goalError ? (
                <Text style={styles.inputHelp}>Results still show the last valid size of {groupSize} until this entry is applied.</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.resultsHeader}>
            <Text style={styles.sectionEyebrow}>GROUP ORDER IDEAS</Text>
            <HeadingText level={2} style={styles.resultTitle}>At least {quantityText(selectedCategory, groupSize)}</HeadingText>
            <Text style={styles.resultIntro}>
              {query.status === 'success'
                ? `${solutionGroups.length} matching menu variant${solutionGroups.length === 1 ? '' : 's'} across ${solutionLocationCount} location${solutionLocationCount === 1 ? '' : 's'} within ${radiusMiles} miles.`
                : 'Finding repeatable menu sizes in the Convex snapshot.'}
            </Text>
          </View>

          {query.status === 'success' ? (
            <View style={styles.snapshotBand}>
              <View style={styles.snapshotDot} />
              <Text style={styles.snapshotText}>
                {query.data.length} current-board offers · {boardChainCount} {boardChainCount === 1 ? 'chain' : 'chains'} · checked {dateLabel(query.metadata.observed_at)}
              </Text>
            </View>
          ) : null}

          {recentQuery.status === 'success' && recentRows.length > 0 ? (
            <LinkPressable href="/sources" style={({ pressed }) => [styles.recentInventory, pressed && styles.pressed]}>
              <View style={styles.recentInventoryCopy}>
                <Text style={styles.recentInventoryLabel}>MORE RECENT DATABASE RECORDS</Text>
                <Text style={styles.recentInventoryText}>{recentRows.length} recent offers · {recentChainCount} {recentChainCount === 1 ? 'chain' : 'chains'} · {recentCategoryCount} {recentCategoryCount === 1 ? 'category' : 'categories'}</Text>
                <Text style={styles.recentInventoryNote}>May include other crawl locations; kept out of these totals.</Text>
              </View>
              <Text style={styles.recentInventoryLink}>Sources →</Text>
            </LinkPressable>
          ) : null}

          <QueryStatePanel status={query.status} />

          {query.status === 'success' && (solutions.length ? (
            <View style={styles.solutionGroups}>
              {solutionGroups.map((group) => (
                <View key={group.key} style={styles.solutionGroup}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupEyebrow}>SAME MENU VARIANT</Text>
                    <Text style={styles.currencyBadge}>{group.rows[0].currency}</Text>
                  </View>
                  <Text style={styles.groupVariant}>{group.variant}</Text>
                  <View style={styles.solutionList}>
                    {group.rows.map((solution, index) => (
                      <View key={solution.location.id} style={[styles.solution, index === 0 && styles.bestSolution, index === 1 && styles.secondSolution]}>
                        <View style={styles.solutionTop}>
                          <View style={styles.solutionNameBlock}>
                            <Text style={[styles.rankLabel, index === 0 && styles.bestInk]}>
                              {index === 0 ? 'LOWEST TOTAL IN THIS VARIANT' : `LOCATION ${String(index + 1).padStart(2, '0')}`}
                            </Text>
                            <Text style={[styles.restaurant, index === 0 && styles.bestInk]}>{solution.chain.name}</Text>
                            <Text style={[styles.subtle, index === 0 && styles.bestInk]}>{solution.location.store_name}</Text>
                          </View>
                          <View style={styles.totalBlock}>
                            <Text style={[styles.controlLabel, index === 0 && styles.bestInk]}>ORDER TOTAL</Text>
                            <Text style={[styles.total, index === 0 && styles.bestInk, tabular]}>{money(solution.totalCents, solution.currency)}</Text>
                          </View>
                        </View>
                        <View style={[styles.rule, index === 0 && styles.bestRule]} />
                        {solution.orders.map(({ offer, quantity }) => (
                          <Text key={offer.id} style={[styles.orderLine, index === 0 && styles.bestInk]}>
                            {quantity} × {offer.original_name} · {money(offer.list_price_cents, offer.currency)} each
                          </Text>
                        ))}
                        <View style={styles.solutionFooter}>
                          <Text style={[styles.solutionFacts, index === 0 && styles.bestInk, tabular]}>
                            {quantityText(selectedCategory, solution.units)} · {solution.extraUnits} extra · {solution.distance_miles == null ? 'distance unavailable' : `${solution.distance_miles.toFixed(1)} mi away`}
                          </Text>
                          <Text style={[styles.solutionStatus, index === 0 && styles.bestInk]}>
                            Recent menu prices · not a live order quote
                          </Text>
                        </View>
                        <View style={styles.inspectButton}>
                          <LinkPressable
                            href={offerDetailRoute(solution.orders[0].offer.id, query.metadata.job?._id) as never}
                            style={styles.inspectLink}>
                            <Text style={styles.inspectLinkText}>Inspect menu size</Text>
                          </LinkPressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : query.status === 'success' ? (
            <NoticeBand title={emptyTitle(query.data.length, records.length, boardCategories.length, categoryRecords.length, eligibleCount)} tone="warning">
              {emptyMessage(query.data.length, records.length, boardCategories.length, categoryRecords.length, eligibleCount, selectedCategoryInfo.label, radiusMiles)}
            </NoticeBand>
          ) : null)}

          <NoticeBand title="How the total is built">
            The solver repeats comparable à la carte pickup packs to meet your goal at one location. It keeps each menu variant and currency separate, then shows any extra pieces. Prices come from scraped menus and can change before checkout.
          </NoticeBand>
        </View>
      </View>
    </AppFrame>
  );
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'time unavailable'
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function emptyTitle(boardCount: number, inRadiusCount: number, boardCategoryCount: number, categoryCount: number, eligibleCount: number) {
  if (boardCount === 0) return 'No menu records yet';
  if (inRadiusCount === 0) return 'No nearby records';
  if (boardCategoryCount === 0) return 'No classified categories yet';
  if (categoryCount === 0) return 'No matching chicken category';
  if (eligibleCount === 0) return 'No comparable packs yet';
  return 'No matching order meets this goal';
}

function emptyMessage(boardCount: number, inRadiusCount: number, boardCategoryCount: number, categoryCount: number, eligibleCount: number, categoryLabel: string, radiusMiles: number) {
  if (boardCount === 0) return 'Convex has not returned any menu offers for this board yet. Check again after a scrape completes.';
  if (inRadiusCount === 0) return `No records with a saved distance are within ${radiusMiles} miles. Try a wider distance in Compare settings.`;
  if (boardCategoryCount === 0) return 'Nearby menu records are present, but Convex has no category labels for them yet, so they cannot be grouped into a quantity comparison.';
  if (categoryCount === 0) return `Convex has records nearby, but none is classified as ${categoryLabel.toLowerCase()}. Choose a category with returned offers.`;
  if (eligibleCount === 0) return 'Nearby offers exist, but none has verified first-party pickup pricing and a whole pack quantity for this comparison.';
  return 'Try a smaller goal. The solver keeps menu variant, currency, and pickup channel matched.';
}

const styles = StyleSheet.create({
  screen: { width: '100%', gap: 0 },
  hero: { backgroundColor: colors.orange, paddingTop: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: 30, gap: spacing.sm, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  brand: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 31, lineHeight: 35, letterSpacing: -0.7, textAlign: 'center', maxWidth: 360 },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  inner: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
  goalPanel: { backgroundColor: colors.lime, borderRadius: 28, padding: spacing.lg, gap: spacing.lg },
  categoryBlock: { gap: spacing.sm },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 999 },
  categoryChipSelected: { backgroundColor: colors.purple, borderColor: colors.purple },
  categoryChipText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  categoryChipTextSelected: { color: colors.white },
  noCategories: { color: '#485439', fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.72 },
  controlLabel: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, lineHeight: 14 },
  goalReadout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md },
  goalValueLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  goalValue: { color: colors.purple, fontFamily: fonts.bold, fontSize: 58, lineHeight: 62 },
  goalUnit: { color: colors.black, fontFamily: fonts.medium, fontSize: 16 },
  rangeBadge: { backgroundColor: '#FFFFFFA8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  rangeText: { color: colors.black, fontFamily: fonts.bold, fontSize: 11 },
  sliderBlock: { alignSelf: 'stretch', gap: spacing.xs },
  sliderHost: { width: '100%', height: 48, justifyContent: 'center' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { color: '#485439', fontFamily: fonts.medium, fontSize: 11 },
  exactEntry: { gap: spacing.xs },
  exactEntryRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.md },
  inputHelp: { color: '#485439', fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  resultsHeader: { gap: spacing.xs },
  sectionEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7, lineHeight: 16 },
  resultTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontSize: 25, lineHeight: 30, letterSpacing: -0.4 },
  resultIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  snapshotBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.cream, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  snapshotDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple },
  snapshotText: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  recentInventory: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.sky, borderRadius: 20 },
  recentInventoryCopy: { flex: 1, gap: 3 },
  recentInventoryLabel: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, lineHeight: 14 },
  recentInventoryText: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  recentInventoryNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  recentInventoryLink: { color: colors.purple, fontFamily: fonts.bold, fontSize: 12 },
  solutionGroups: { gap: spacing.xl },
  solutionGroup: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  groupEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7 },
  currencyBadge: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, backgroundColor: colors.cream, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  groupVariant: { color: colors.black, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  solutionList: { gap: spacing.sm },
  solution: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: 24, padding: spacing.lg, gap: spacing.md },
  bestSolution: { backgroundColor: colors.lime, borderColor: colors.lime },
  secondSolution: { backgroundColor: colors.sky, borderColor: colors.sky },
  solutionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  solutionNameBlock: { flex: 1, gap: 3 },
  rankLabel: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6, lineHeight: 13 },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  subtle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  totalBlock: { alignItems: 'flex-end', minWidth: 86, gap: 3 },
  total: { color: colors.black, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, ...tabular },
  rule: { height: 1, backgroundColor: colors.warmRule },
  bestRule: { backgroundColor: '#66784A' },
  orderLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  solutionFooter: { gap: spacing.xs },
  solutionFacts: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, lineHeight: 17 },
  solutionStatus: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  inspectButton: { alignSelf: 'flex-start', minWidth: 150 },
  inspectLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.cream, paddingHorizontal: spacing.md },
  inspectLinkText: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  bestInk: { color: colors.black },
});
