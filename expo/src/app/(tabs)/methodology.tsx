import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, radii, spacing } from '@/theme';

const RULES = [
  { title: 'Compare like with like', body: 'Nuggets and tenders are compared separately. Only standalone pickup items with an explicit piece count and usable price are eligible. Combo meals and mixed bundles are excluded.' },
  { title: 'Rank by the exact unit price', body: 'Divide the total pickup price by the stated piece count. Rankings use the exact ratio before rounding the displayed amount. Ties use total price, then distance. Original counts, prices, locations, and source records remain inspectable.' },
  { title: 'Keep distance in context', body: 'Distances are illustrative straight-line estimates from the selected sample area. They do not represent a driving route or travel time.' },
  { title: 'Choose a purchasable combination', body: 'For a piece target, repeat the listed order sizes at one restaurant and choose the least expensive combination that reaches or exceeds the target. Extra pieces are shown. Orders from separate locations are never combined.' },
  { title: 'Show data limits', body: 'Stale samples remain inspectable with a recheck label. Incomplete and unavailable records are excluded from price rankings and group orders. Taxes, fees, coupons, and loyalty prices are outside this comparison.' },
];

export default function MethodologyScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Method">
      <PageHeading title="Clear prices. Clear method." description="The rules behind eligibility, price per piece, and minimum-count orders." />
      <NoticeBand title="Illustrative comparison" tone="neutral">
        All current records are synthetic. These rules describe the comparison behavior; the sample data does not establish current restaurant prices or coverage.
      </NoticeBand>
      {RULES.map((rule, index) => (
        <View key={rule.title} style={styles.ruleBlock}>
          <SectionHeading title={rule.title} trailing={'RULE 0' + (index + 1)} />
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}
      <HardRule />
      <View style={styles.mathBlock}>
        <Text style={styles.mathLabel}>PRICE PER PIECE</Text>
        <Text style={styles.mathFormula}>pickup price ÷ stated piece count</Text>
        <Text style={styles.mathLabel}>GROUP ORDER</Text>
        <Text style={styles.mathFormula}>lowest valid order total at one restaurant</Text>
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
  mathBlock: { backgroundColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  mathLabel: { color: colors.yellow, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, marginTop: spacing.sm },
  mathFormula: { color: colors.white, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
});
