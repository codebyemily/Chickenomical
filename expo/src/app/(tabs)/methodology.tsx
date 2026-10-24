import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, HardRule, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, radii, spacing } from '@/theme';

const RULES = [
  { title: 'Compare one category and variant at a time', body: 'The shared menu schema uses stable category IDs for nuggets, tenders, buckets, wings, sandwiches, sliders, wraps, and chicken fries. Prep, heat, breading, build, flavor, cut mix, meat, and protein makeup stay attached to the offer; differing values and unstated values appear in separate comparisons.' },
  { title: 'Keep channels and prices explicit', body: 'The default comparison uses verified à la carte first-party pickup offers. List price remains separate from delivery and service fees, tax, tips, and deals. Offers only rank together when channel, currency, and menu variant match.' },
  { title: 'Divide list price by quantity', body: 'Unit price is list_price_cents divided by the known quantity. The app rounds only the displayed result; the original price, quantity, location, provider, source item, and observed time remain available for inspection.' },
  { title: 'Keep bundles and deals intact', body: 'Combos and family meals keep their component lists and parent price, but do not enter à la carte unit rankings. Deals stay separate from menu offers, with their own schedule, conditions, source, and location confirmation.' },
  { title: 'Hatch a purchasable total', body: 'The quantity solver repeats comparable offer sizes at one location and within one currency and variant. It finds the lowest total that reaches or exceeds the requested number of category units, shows extra units, and never combines orders from different locations.' },
  { title: 'Leave uncertain records visible', body: 'Rows without an exact quantity, list price, or verified status stay inspectable but out of comparison. Older rows carry a recheck label. The mock uses synthetic records and keeps that status visible.' },
];

export default function MethodologyScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Method">
      <PageHeading title="The menu schema sets the rules." description="These rules explain which schema-shaped offers can rank, how deals stay separate, and how uncertainty is shown." />
      <NoticeBand title="That's no yolk" tone="warning">
        All current records are synthetic fixtures. They follow the documented chain, location, menu offer, and deal model; they do not claim real restaurant coverage or current prices.
      </NoticeBand>
      {RULES.map((rule, index) => (
        <View key={rule.title} style={styles.ruleBlock}>
          <SectionHeading title={rule.title} trailing={'RULE 0' + (index + 1)} />
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}
      <HardRule />
      <View style={styles.mathBlock}>
        <Text style={styles.mathLabel}>PRICE PER CATEGORY UNIT</Text>
        <Text style={styles.mathFormula}>list_price_cents ÷ quantity</Text>
        <Text style={styles.mathLabel}>QUANTITY GOAL</Text>
        <Text style={styles.mathFormula}>lowest comparable total at one location</Text>
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
