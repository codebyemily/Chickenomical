import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { locationsInRadius, money, solveAllLocations } from '@/lib/compare';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing, tabular } from '@/theme';

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

  function applyGoal(nextGoal = goal) {
    const normalized = nextGoal.trim();
    const count = Number.parseInt(normalized, 10);
    if (!/^[0-9]+$/.test(normalized) || !Number.isFinite(count) || count < 1 || count > 100) {
      setGoalError('Enter a whole number from 1 to 100 pieces.');
      return;
    }
    setGoalError(null);
    setGoal(String(count));
    setSubmittedGoal(count);
  }

  return (
    <AppFrame active="Compare">
      <PageHeading
        title="Meet a piece target for less."
        description="The solver combines available standalone sizes at each restaurant and compares the actual order total."
      />

      <View style={styles.controls}>
        <View style={styles.categoryBlock}>
          <Text style={styles.controlLabel}>CHICKEN TYPE</Text>
          <View style={styles.buttonRow}>
            <ActionButton kind={category === 'nuggets' ? 'primary' : 'secondary'} onPress={() => setCategory('nuggets')}>Nuggets</ActionButton>
            <ActionButton kind={category === 'tenders' ? 'primary' : 'secondary'} onPress={() => setCategory('tenders')}>Tenders</ActionButton>
          </View>
        </View>
        <View style={styles.goalRow}>
          <View style={styles.fieldWrap}>
            <FormField
              label="At least how many pieces?"
              value={goal}
              onChangeText={(value) => { setGoal(value); setGoalError(null); }}
              keyboardType="numeric"
              submitLabel="done"
              onSubmitEditing={() => applyGoal()}
              help="Choose a whole number from 1 to 100."
            />
          </View>
          <View style={styles.calculateButton}>
            <ActionButton kind="primary" onPress={() => applyGoal()}>
              Recalculate
            </ActionButton>
          </View>
        </View>
        {goalError ? <NoticeBand title="Check the piece goal" tone="warning">{goalError}</NoticeBand> : null}
        <View style={styles.presets}>
          {[8, 12, 20].map((count) => (
            <ActionButton key={count} kind={submittedGoal === count ? 'primary' : 'secondary'} onPress={() => applyGoal(String(count))}>
              {`${count} pieces`}
            </ActionButton>
          ))}
        </View>
      </View>

      <View style={styles.resultHeading}>
        <SectionHeading title={`At least ${submittedGoal} pieces`} trailing="LOWEST SAMPLE TOTAL PER LOCATION" />
        <Text style={styles.resultIntro}>
          {solutions.length} sample location{solutions.length === 1 ? '' : 's'} with enough comparable menu sizes within {radiusMiles} miles.
        </Text>
      </View>

      {solutions.length ? (
        <View style={styles.solutionList}>
          {solutions.map((solution, index) => (
            <View key={solution.location.id} style={[styles.solution, index === 0 && styles.bestSolution]}>
              <View style={styles.solutionTop}>
                <View style={styles.solutionNameBlock}>
                  <Text style={[styles.rankLabel, index === 0 && styles.bestInk]}>{index === 0 ? 'LOWEST SAMPLE ORDER TOTAL' : `LOCATION ${String(index + 1).padStart(2, '0')}`}</Text>
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
        <NoticeBand title="No sample combination meets that target" tone="warning">
          Reduce the piece target, choose another chicken type, or expand the radius. Only rows with an explicit count and sample pickup price enter the solver.
        </NoticeBand>
      )}

      <NoticeBand title="How the combination is chosen">
        The demo checks repeatable quantities of each sample size, up to the smallest sufficient total, then chooses the least expensive combination. Ties go to fewer extra pieces, then closer location.
      </NoticeBand>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  controls: { backgroundColor: colors.white, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.black },
  categoryBlock: { gap: spacing.xs },
  controlLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.85 },
  buttonRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-end' },
  fieldWrap: { flexGrow: 1, maxWidth: 360 },
  calculateButton: { minWidth: 140, marginBottom: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  resultHeading: { gap: spacing.sm },
  resultIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  solutionList: { gap: spacing.sm },
  solution: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.black, padding: spacing.md, gap: spacing.md },
  bestSolution: { backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.black, padding: spacing.lg },
  solutionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  solutionNameBlock: { flex: 1, gap: 3 },
  rankLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.75 },
  restaurant: { color: colors.black, fontFamily: fonts.bold, fontSize: 19, lineHeight: 26 },
  subtle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  totalBlock: { alignItems: 'flex-end', minWidth: 90, gap: 3 },
  total: { color: colors.black, fontFamily: fonts.bold, fontSize: 31, lineHeight: 36, ...tabular },
  rule: { height: 1, backgroundColor: colors.rule },
  bestRule: { backgroundColor: colors.black, opacity: 0.45 },
  orderLine: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  solutionFooter: { gap: 4 },
  solutionFacts: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, lineHeight: 19 },
  solutionStatus: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  inspectButton: { alignSelf: 'flex-start', minWidth: 160 },
  bestInk: { color: colors.black },
  bestMuted: { color: '#353535' },
});
