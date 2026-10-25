import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, PageHeading } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { QueryStatePanel } from '@/components/query-state-panel';
import { useLiveOffersQuery, useRecentOffersQuery } from '@/data/live-offers';
import { categoryInfo } from '@/data/menu-schema';
import { colors, fonts, radii, spacing, tabular } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Page not found',
  'This Chickenomical page could not be found. Return to nearby comparisons or browse saved source records.',
);

export default function NotFoundScreen() {
  const recentQuery = useRecentOffersQuery();
  const boardQuery = useLiveOffersQuery();
  const records = recentQuery.status === 'success' ? recentQuery.data : [];
  const chainNames = [...new Set(records.map(({ chain }) => chain.name))].sort((a, b) => a.localeCompare(b));
  const categories = [...new Set(records.flatMap(({ offer }) => offer.category ? [offer.category] : []))]
    .sort((a, b) => categoryInfo(a).label.localeCompare(categoryInfo(b).label));
  const latestObservedAt = records.reduce<string | null>((latest, { offer }) => {
    if (!latest || Date.parse(offer.observed_at) > Date.parse(latest)) return offer.observed_at;
    return latest;
  }, null);

  return (
    <AppFrame active="Compare">
      <PageHeading
        title="This address is off the menu."
        description="The screen you opened does not exist. Head back to Compare, or browse the offers currently stored in Chickenomical."
      />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>404 · WRONG TURN</Text>
        <HeadingText level={2} style={styles.heroTitle}>Let’s get you back to the good stuff.</HeadingText>
        <Text style={styles.heroDescription}>Compare nearby chicken offers or follow an offer back to its source.</Text>
        <View style={styles.actions}>
          <LinkPressable href="/" replace style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Back to Compare</Text>
            <Text accessibilityElementsHidden style={styles.buttonArrow}>→</Text>
          </LinkPressable>
          <LinkPressable href="/sources" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Browse sources</Text>
          </LinkPressable>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard label="RECENT STORED OFFERS" value={recentQuery.status === 'success' ? String(records.length) : '—'} tone="lime" />
        <StatCard label="CHAINS IN THESE ROWS" value={recentQuery.status === 'success' ? String(chainNames.length) : '—'} tone="sky" />
        <StatCard label="CATEGORIES IN THESE ROWS" value={recentQuery.status === 'success' ? String(categories.length) : '—'} tone="purple" />
      </View>

      <View style={styles.dataPanel}>
        <View style={styles.dataHeading}>
          <Text style={styles.dataEyebrow}>LIVE CONVEX READ</Text>
          <Text style={styles.updatedAt}>{latestObservedAt ? `OBSERVED ${formatObservedAt(latestObservedAt)}` : 'DATABASE COVERAGE'}</Text>
        </View>
        <Text style={styles.dataTitle}>What’s in the database</Text>
        <Text style={styles.dataDescription}>Counts below come from the most recent stored menu offer records returned by Convex. They may span different scrape times and locations.</Text>

        <QueryStatePanel status={recentQuery.status} />

        {recentQuery.status === 'success' ? (
          records.length > 0 ? (
            <View style={styles.coverage}>
              <View style={styles.coverageGroup}>
                <Text style={styles.coverageLabel}>CHAINS</Text>
                <View style={styles.chips}>
                  {chainNames.map((name) => <CoverageChip key={name} label={name} />)}
                </View>
              </View>
              <View style={styles.coverageGroup}>
                <Text style={styles.coverageLabel}>CATEGORIES</Text>
                <View style={styles.chips}>
                  {categories.map((category) => <CoverageChip key={category} label={categoryInfo(category).label} />)}
                  {records.some(({ offer }) => !offer.category) ? <CoverageChip label="Unclassified" /> : null}
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyCopy}>Convex returned no recent menu offer records.</Text>
          )
        ) : null}

        <View style={styles.boardSummary}>
          <Text style={styles.coverageLabel}>CURRENT COMPARISON BOARD</Text>
          {boardQuery.status === 'success' ? (
            <Text style={styles.boardCopy}>
              {boardQuery.data.length} {boardQuery.data.length === 1 ? 'offer' : 'offers'} on the latest board
              {boardQuery.metadata.job?.status ? ` · scrape ${boardQuery.metadata.job.status}` : ''}.
            </Text>
          ) : (
            <Text style={styles.boardCopy}>{boardQuery.status === 'loading' ? 'Checking the latest board…' : 'The latest board is temporarily unavailable.'}</Text>
          )}
        </View>
      </View>
    </AppFrame>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'lime' | 'sky' | 'purple' }) {
  return (
    <View style={[styles.statCard, tone === 'lime' && styles.statLime, tone === 'sky' && styles.statSky, tone === 'purple' && styles.statPurple]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function CoverageChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function formatObservedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.orange,
    borderRadius: radii.lg,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  eyebrow: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1, lineHeight: 16 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.8, lineHeight: 36 },
  heroDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, maxWidth: 560 },
  actions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  primaryButton: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.md, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  buttonArrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 22 },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.cream, borderColor: colors.purple, borderRadius: radii.pill, borderWidth: 1.5, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 14 },
  pressed: { opacity: 0.7 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { borderRadius: radii.md, flexGrow: 1, flexBasis: 105, gap: spacing.xs, minHeight: 92, padding: spacing.md },
  statLime: { backgroundColor: colors.lime },
  statSky: { backgroundColor: colors.sky },
  statPurple: { backgroundColor: colors.purpleSoft },
  statLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.3, lineHeight: 14 },
  statValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, ...tabular },
  dataPanel: { backgroundColor: colors.white, borderColor: colors.warmRule, borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  dataHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' },
  dataEyebrow: { color: colors.purple, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8, lineHeight: 16 },
  updatedAt: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, lineHeight: 15 },
  dataTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 21, letterSpacing: -0.4, lineHeight: 26 },
  dataDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  coverage: { gap: spacing.lg, paddingTop: spacing.xs },
  coverageGroup: { gap: spacing.sm },
  coverageLabel: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, lineHeight: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.cream, borderColor: colors.warmRule, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  emptyCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  boardSummary: { borderTopColor: colors.warmRule, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.xs, paddingTop: spacing.md },
  boardCopy: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
});
