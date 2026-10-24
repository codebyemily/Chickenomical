import { Slider } from '@expo/ui/community/slider';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { CategoryPicker } from '@/components/category-picker';
import { FormField } from '@/components/form-field';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { api, useMockConvexQuery, type OfferRecord } from '@/data/mock-convex';
import { CATEGORY_INFO, categoryUnit, quantityText } from '@/data/menu-schema';
import { money, solveAllLocations } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

const EMPTY_RECORDS: OfferRecord[] = [];

export default function QuantityScreen() {
  const router = useRouter();
  const { category, setCategory, area, radiusMiles } = usePrototype();
  const [goal, setGoal] = useState('12');
  const [submittedGoal, setSubmittedGoal] = useState(12);
  const [goalError, setGoalError] = useState<string | null>(null);
  const query = useMockConvexQuery(api.offers.nearby, { category, area, radiusMiles });
  const records = query.data ?? EMPTY_RECORDS;
  const categoryInfo = CATEGORY_INFO[category];
  const solutions = useMemo(
    () => solveAllLocations(records, category, submittedGoal),
    [records, category, submittedGoal],
  );
  const solutionGroups = useMemo(() => {
    const byVariant = new Map<string, typeof solutions>();
    for (const solution of solutions) {
      const rows = byVariant.get(solution.variantKey) ?? [];
      rows.push(solution);
      byVariant.set(solution.variantKey, rows);
    }
    return [...byVariant].map(([key, rows]) => ({ key, variant: rows[0].variant, rows }));
  }, [solutions]);
  const solutionLocationCount = new Set(solutions.map((solution) => solution.location.id)).size;
  const best = solutions[0];
  const bestPlanKey = best
    ? `${best.location.id}:${best.orders.map(({ offer, quantity }) => `${offer.id}x${quantity}`).join(',')}`
    : 'no-solution';
  const previousPlan = useRef(bestPlanKey);
  const lastHapticAt = useRef(0);

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
      setGoalError(`Enter a whole number from 1 to 100 ${categoryInfo.plural}. Don\'t count your chickens past 100.`);
      return false;
    }
    setGoalError(null);
    setGoal(String(count));
    setSubmittedGoal(count);
    return true;
  }

  function changeFromSlider(value: number) {
    const next = Math.min(100, Math.max(1, Math.round(value)));
    setGoal(String(next));
    setSubmittedGoal(next);
    setGoalError(null);
  }

  function changeFromText(value: string) {
    setGoal(value);
    setGoalError(null);
    if (!/^[0-9]+$/.test(value)) return;
    const next = Number(value);
    if (next >= 1 && next <= 100) setSubmittedGoal(next);
  }

  return (
    <AppFrame active="Group">
      <PageHeading
        title="Hatch a flock order"
        description="Find the lowest sample total for a requested quantity at one nearby location. The solver uses comparable à la carte offers from the selected category."
      />

      <View style={styles.goalPanel}>
        <View style={styles.categoryBlock}>
          <Text style={styles.controlLabel}>MENU CATEGORY</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>

        <View style={styles.goalReadout}>
          <View>
            <Text style={styles.controlLabel}>MINIMUM QUANTITY</Text>
            <View style={styles.goalValueLine}>
              <Text accessibilityLiveRegion="polite" style={[styles.goalValue, tabular]}>{submittedGoal}</Text>
              <Text style={styles.goalUnit}>{categoryUnit(category, submittedGoal)}</Text>
            </View>
          </View>
          <Text style={styles.goalRange}>1–100</Text>
        </View>

        <View style={styles.sliderBlock}>
          <Slider
            accessibilityLabel="Minimum group size"
            accessibilityHint={`Set the number of ${categoryInfo.plural} for the order. The least-cost combination updates as you move the slider.`}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={submittedGoal}
            minimumTrackTintColor={colors.black}
            maximumTrackTintColor={colors.rule}
            thumbTintColor={colors.black}
            onValueChange={changeFromSlider}
            style={Platform.OS === 'web' ? styles.sliderWeb : styles.slider}
            testID="piece-goal-slider"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 {categoryUnit(category, 1)}</Text>
            <Text style={styles.sliderLabel}>100 {categoryInfo.plural}</Text>
          </View>
        </View>

        <View style={styles.exactEntry}>
          <FormField
            label={`Set an exact ${categoryInfo.unit} goal`}
            value={goal}
            onChangeText={changeFromText}
            keyboardType="numeric"
            submitLabel="done"
            onSubmitEditing={() => commitGoal(goal)}
            help="Type a whole number from 1 to 100, or use the slider."
          />
          {goalError ? <Text accessibilityRole="alert" style={styles.goalError}>{goalError}</Text> : null}
        </View>
      </View>

      <View style={styles.resultHeading}>
        <SectionHeading title={`At least ${quantityText(category, submittedGoal)}`} trailing="TOTALS BY MATCHING VARIANT" />
        <Text style={styles.resultIntro}>
          {query.status === 'success'
            ? `${solutionGroups.length} matching variant group${solutionGroups.length === 1 ? '' : 's'} across ${solutionLocationCount} sample location${solutionLocationCount === 1 ? '' : 's'} within ${radiusMiles} miles.`
            : 'Reading nearby sample offers.'}
        </Text>
      </View>

      <QueryStatePanel status={query.status} error={query.error} onRetry={query.refetch} />

      {query.status === 'success' && (solutions.length ? (
        <View style={styles.solutionGroups}>
          {solutionGroups.map((group) => (
            <View key={group.key} style={styles.solutionGroup}>
              <SectionHeading title="Matching variant" trailing="SAME CURRENCY" />
              <Text style={styles.groupVariant}>{group.variant}</Text>
              <View style={styles.solutionList}>
                {group.rows.map((solution, index) => (
                  <View key={solution.location.id} style={[styles.solution, index === 0 && styles.bestSolution]}>
                    <View style={styles.solutionTop}>
                      <View style={styles.solutionNameBlock}>
                        <Text style={[styles.rankLabel, index === 0 && styles.bestInk]}>
                          {index === 0 ? 'LOWEST SAMPLE ORDER TOTAL' : `LOCATION ${String(index + 1).padStart(2, '0')}`}
                        </Text>
                        <Text style={[styles.restaurant, index === 0 && styles.bestInk]}>{solution.chain.name}</Text>
                        <Text style={[styles.subtle, index === 0 && styles.bestMuted]}>{solution.location.store_name}</Text>
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
                        {quantityText(category, solution.units)} · {solution.extraUnits} extra · {solution.distance_miles.toFixed(1)} mi straight-line sample
                      </Text>
                      <Text style={[styles.solutionStatus, index === 0 && styles.bestInk]}>
                        Synthetic prices · not a live order quote
                      </Text>
                    </View>
                    <View style={styles.inspectButton}>
                      <ActionButton kind="secondary" onPress={() => router.push(`/offer/${solution.orders[0].offer.id}` as never)}>
                        Inspect sample menu size
                      </ActionButton>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : query.status === 'success' ? (
        <NoticeBand title="No sample order meets this goal" tone="warning">
          Try a smaller goal, another menu category, or a larger search radius. Only verified, comparable à la carte pickup offers can be included.
        </NoticeBand>
      ) : null)}

      <NoticeBand title="How the combination is chosen">
        The local mock checks repeatable quantities of each comparable offer and selects the lowest total at each location. It shows any extra units and never combines orders across locations.
      </NoticeBand>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  goalPanel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.lg },
  categoryBlock: { gap: spacing.sm },
  categoryButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  controlLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.85 },
  goalReadout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md },
  goalValueLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  goalValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 56, lineHeight: 60 },
  goalUnit: { color: colors.black, fontFamily: fonts.medium, fontSize: 17 },
  goalRange: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4, paddingBottom: 8 },
  sliderBlock: { alignSelf: 'stretch', gap: spacing.xs },
  slider: { height: 42 },
  sliderWeb: { width: '100%', height: 42 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  exactEntry: { gap: spacing.sm },
  goalError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  resultHeading: { gap: spacing.sm },
  resultIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  solutionGroups: { gap: spacing.xl },
  solutionGroup: { gap: spacing.md },
  groupVariant: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  solutionList: { gap: spacing.sm },
  solution: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, padding: spacing.lg, gap: spacing.md },
  bestSolution: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg },
  solutionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  solutionNameBlock: { flex: 1, gap: 3 },
  rankLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.75 },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 26 },
  subtle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  variant: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  totalBlock: { alignItems: 'flex-end', minWidth: 90, gap: 3 },
  total: { color: colors.black, fontFamily: fonts.bold, fontSize: 31, lineHeight: 36, ...tabular },
  rule: { height: 1, backgroundColor: colors.rule },
  bestRule: { backgroundColor: colors.black, opacity: 0.45 },
  orderLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  solutionFooter: { gap: spacing.xs },
  solutionFacts: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 19 },
  solutionStatus: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  inspectButton: { alignSelf: 'flex-start', minWidth: 160 },
  bestInk: { color: colors.black },
  bestMuted: { color: '#353535' },
});
