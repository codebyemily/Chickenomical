import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, radii, spacing } from '@/theme';

const RULES = [
  { title: 'Keep the flock sorts separate', body: 'Nuggets and tenders stay in separate pecking orders. Combo meals, mixed bundles, and items without a stated piece count cannot enter the per-peck comparison. Birds of a feather rank together.' },
  { title: 'Divide scratch by pecks', body: 'Each eligible offer is ranked by total pickup price divided by its stated piece count. The original total, count, roost, source label, channel, and check time stay beside that result. Hard-boiled math, no fowl play.' },
  { title: 'As the crow flies', body: 'Distance is an as-the-crow-flies sample estimate. It does not represent a driving route or travel time. Why did the chicken cross the road? Only after a unit-price tie, then total scratch, then crow-flies distance.' },
  { title: 'Hatch a purchasable total', body: 'For a piece goal, the prototype repeats listed order sizes at one roost and finds the least expensive combination that reaches or exceeds the goal. Extra pieces are shown; offers from different coops are never combined. A bird in this hand is worth two from another restaurant.' },
  { title: "Don't count unhatched chickens", body: 'Stale leftovers remain inspectable but carry a recheck label. Incomplete and unavailable records are scratched from price ranking and the flock hatch. If it is not a spring chicken, we say so.' },
];

export default function MethodologyScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Method">
      <PageHeading title="The rules of the roost." description="These rules explain what can rank, what flew the coop, and how sample data is treated. No fowl play: the math stays inspectable." />
      <NoticeBand title="That's no yolk" tone="warning">
        All current records are synthetic. These rules describe intended comparison behavior and do not claim real restaurant coverage or current prices. Don&apos;t count these chickens.
      </NoticeBand>
      {RULES.map((rule, index) => (
        <View key={rule.title} style={styles.ruleBlock}>
          <SectionHeading title={rule.title} trailing={'RULE 0' + (index + 1)} />
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}
      <HardRule />
      <View style={styles.mathBlock}>
        <Text style={styles.mathLabel}>PRICE PER PECK</Text>
        <Text style={styles.mathFormula}>pickup scratch ÷ stated pecks</Text>
        <Text style={styles.mathLabel}>FLOCK GOAL</Text>
        <Text style={styles.mathFormula}>lowest valid order total at one roost</Text>
      </View>
      <ActionButton kind="secondary" onPress={() => router.push('/states' as never)}>
        Preview every fowl-up
      </ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  ruleBlock: { gap: spacing.sm },
  body: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  mathBlock: { backgroundColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  mathLabel: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8, marginTop: spacing.sm },
  mathFormula: { color: colors.white, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
});
