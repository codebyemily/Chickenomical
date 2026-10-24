import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Slider } from '@expo/ui/community/slider';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { locationsInRadius, money, solveAllLocations } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

export default function QuantityScreen() {
  const router = useRouter();
  const { category, setCategory, area, radiusMiles } = usePrototype();
  const [goal, setGoal] = useState('12');
  const [submittedGoal, setSubmittedGoal] = useState(12);
  const [goalError, setGoalError] = useState<string | null>(null);
  const locations = locationsInRadius(area, radiusMiles, category);
  const solutions = useMemo(
    () => solveAllLocations(locations, category, submittedGoal, area),
    [locations, category, submittedGoal, area],
  );
  const best = solutions[0];
  const bestPlanKey = best
    ? `${best.location.id}:${best.orders.map(({ offer, quantity }) => `${offer.id}x${quantity}`).join(',')}`
    : 'no-solution';
  const previousPlan = useRef(bestPlanKey);
  const lastHapticAt = useRef(0);

  useEffect(() => {
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
  }, [bestPlanKey]);

  function commitGoal(nextGoal: string) {
    const normalized = nextGoal.trim();
    const count = Number.parseInt(normalized, 10);
    if (!/^[0-9]+$/.test(normalized) || !Number.isFinite(count) || count < 1 || count > 100) {
      setGoalError('Enter a whole number from 1 to 100 pieces.');
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
        title="Plan a group order."
        description="Find the lowest sample order total that meets your piece target at one nearby restaurant."
      />

      <View style={styles.goalPanel}>
        <View style={styles.categoryBlock}>
          <Text style={styles.controlLabel}>CHICKEN TYPE</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.categoryButtons}>
              <ActionButton selected={category === 'nuggets'} kind={category === 'nuggets' ? 'primary' : 'secondary'} onPress={() => setCategory('nuggets')}>
                Nuggets
              </ActionButton>
              <ActionButton selected={category === 'tenders'} kind={category === 'tenders' ? 'primary' : 'secondary'} onPress={() => setCategory('tenders')}>
                Tenders
              </ActionButton>
            </View>
          ) : (
            <SegmentedControl
              accessibilityLabel="Chicken type"
              values={['Nuggets', 'Tenders']}
              selectedIndex={category === 'nuggets' ? 0 : 1}
              tintColor={colors.white}
              onValueChange={(value) => setCategory(value === 'Tenders' ? 'tenders' : 'nuggets')}
            />
          )}
        </View>

        <View style={styles.goalReadout}>
          <View>
            <Text style={styles.controlLabel}>MINIMUM PIECES</Text>
            <View style={styles.goalValueLine}>
              <Text accessibilityLiveRegion="polite" style={[styles.goalValue, tabular]}>{submittedGoal}</Text>
              <Text style={styles.goalUnit}>{submittedGoal === 1 ? 'piece' : 'pieces'}</Text>
            </View>
          </View>
          <Text style={styles.goalRange}>1–100</Text>
        </View>

        <View style={styles.sliderBlock}>
          <Slider
            accessibilityLabel="Minimum group size"
            accessibilityHint="Set how many chicken pieces the order should include. The least-cost combination updates as you move the slider."
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
            <Text style={styles.sliderLabel}>1 piece</Text>
            <Text style={styles.sliderLabel}>100 pieces</Text>
          </View>
        </View>

        <View style={styles.exactEntry}>
          <FormField
            label="Set an exact piece goal"
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
        <SectionHeading title={`At least ${submittedGoal} ${submittedGoal === 1 ? 'piece' : 'pieces'}`} trailing="LOWEST TOTAL PER LOCATION" />
        <Text style={styles.resultIntro}>
          {solutions.length} sample location{solutions.length === 1 ? '' : 's'} with enough menu sizes within {radiusMiles} miles.
        </Text>
      </View>

      {solutions.length ? (
        <View style={styles.solutionList}>
          {solutions.map((solution, index) => (
            <View key={solution.location.id} style={[styles.solution, index === 0 && styles.bestSolution]}>
              <View style={styles.solutionTop}>
                <View style={styles.solutionNameBlock}>
                  <Text style={[styles.rankLabel, index === 0 && styles.bestInk]}>
                    {index === 0 ? 'LOWEST SAMPLE ORDER TOTAL' : `LOCATION ${String(index + 1).padStart(2, '0')}`}
                  </Text>
                  <Text style={[styles.restaurant, index === 0 && styles.bestInk]}>{solution.location.chain}</Text>
                  <Text style={[styles.subtle, index === 0 && styles.bestMuted]}>{solution.location.displayName}</Text>
                </View>
                <View style={styles.totalBlock}>
                  <Text style={[styles.controlLabel, index === 0 && styles.bestInk]}>ORDER TOTAL</Text>
                  <Text style={[styles.total, index === 0 && styles.bestInk, tabular]}>{money(solution.totalCents)}</Text>
                </View>
              </View>
              <View style={[styles.rule, index === 0 && styles.bestRule]} />
              {solution.orders.map(({ offer, quantity }) => (
                <Text key={offer.id} style={[styles.orderLine, index === 0 && styles.bestInk]}>
                  {quantity} × {offer.itemName} · {money(offer.priceCents)} each
                </Text>
              ))}
              <View style={styles.solutionFooter}>
                <Text style={[styles.solutionFacts, index === 0 && styles.bestInk, tabular]}>
                  {solution.pieces} pieces · {solution.extraPieces} extra · {solution.distance.toFixed(1)} mi straight-line sample
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
      ) : (
        <NoticeBand title="No sample order meets this goal" tone="warning">
          Try a smaller piece goal, another chicken type, or a larger search radius. Only items with a stated count and sample pickup price can be included.
        </NoticeBand>
      )}

      <NoticeBand title="How the combination is chosen">
        The demo checks repeatable quantities of each sample size and selects the lowest actual total at each location. It shows any extra pieces; it never combines orders from different restaurants.
      </NoticeBand>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  goalPanel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg },
  categoryBlock: { gap: spacing.sm },
  categoryButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  controlLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.85 },
  goalReadout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md },
  goalValueLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  goalValue: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 56, lineHeight: 68, letterSpacing: -3 },
  goalUnit: { color: colors.black, fontFamily: fonts.medium, fontSize: 17 },
  goalRange: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.4, paddingBottom: 8 },
  sliderBlock: { alignSelf: 'stretch', gap: spacing.xs },
  slider: { height: 48 },
  sliderWeb: { width: '100%', height: 48 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  exactEntry: { gap: spacing.sm },
  goalError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  resultHeading: { gap: spacing.sm },
  resultIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  solutionList: { gap: spacing.sm },
  solution: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, padding: spacing.xl, gap: spacing.md },
  bestSolution: { backgroundColor: colors.yellow, borderWidth: 2, borderColor: colors.black, borderRadius: radii.lg },
  solutionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  solutionNameBlock: { flex: 1, gap: 3 },
  rankLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.75 },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 26 },
  subtle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  totalBlock: { alignItems: 'flex-end', minWidth: 90, gap: 3 },
  total: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 31, lineHeight: 40, letterSpacing: -1.5, ...tabular },
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
