import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, spacing } from '@/theme';

const RULES = [
  { title: 'Compare the same kind of food', body: 'Nuggets and tenders stay in separate rankings. Combo meals, mixed bundles, and items without a stated piece count cannot enter the per-piece comparison.' },
  { title: 'Divide cents by pieces', body: 'Each eligible offer is ranked by total pickup price divided by its stated piece count. The app keeps the original total, count, location, source label, channel, and check time beside that result.' },
  { title: 'Use a distance tie-breaker', body: 'Distance is a straight-line sample estimate. It does not represent a driving route or travel time. Exact unit-price ties sort by total price, then distance.' },
  { title: 'Solve for a purchasable total', body: 'For a piece goal, the prototype repeats listed order sizes at one location and finds the least expensive combination that reaches or exceeds the goal. Extra pieces are shown; offers from different restaurants are never combined.' },
  { title: 'Keep uncertainty visible', body: 'Stale records remain inspectable but carry a recheck label. Incomplete and unavailable records are excluded from price ranking and the quantity solver.' },
];

export default function MethodologyScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Method">
      <PageHeading title="How comparisons work." description="The rules are part of the result: they explain what can rank, what is left out, and how sample data is treated." />
      <NoticeBand title="Demonstration only" tone="warning">
        All current records are synthetic. These rules describe the intended comparison behavior and do not establish real restaurant coverage or current prices.
      </NoticeBand>
      {RULES.map((rule, index) => (
        <View key={rule.title} style={styles.ruleBlock}>
          <SectionHeading title={rule.title} trailing={'RULE 0' + (index + 1)} />
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}
      <HardRule />
      <View style={styles.mathBlock}>
        <Text style={styles.mathLabel}>UNIT PRICE</Text>
        <Text style={styles.mathFormula}>pickup price ÷ stated pieces</Text>
        <Text style={styles.mathLabel}>QUANTITY GOAL</Text>
        <Text style={styles.mathFormula}>lowest valid order total at one location</Text>
      </View>
      <ActionButton kind="secondary" onPress={() => router.push('/states' as never)}>
        Preview recovery states
      </ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  ruleBlock: { gap: spacing.sm },
  body: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  mathBlock: { backgroundColor: colors.black, padding: spacing.lg, gap: spacing.xs },
  mathLabel: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8, marginTop: spacing.sm },
  mathFormula: { color: colors.white, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
});
