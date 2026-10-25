import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame } from '@/components/app-frame';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { colors, fonts, radii, spacing } from '@/theme';

const SCENARIOS = [
  { id: 'loading', title: 'Loading the comparison', description: 'Preview a first visit while offers are still arriving.' },
  { id: 'no-locations', title: 'No nearby locations', description: 'See how the app explains an empty search area.' },
  { id: 'no-comparable', title: 'Nothing comparable yet', description: 'Review what happens when records cannot be ranked.' },
  { id: 'stale-only', title: 'Offers need a recheck', description: 'Show the age of older source records before relying on them.' },
  { id: 'incomplete', title: 'Quantity is missing', description: 'Explain why a unit price cannot be calculated.' },
  { id: 'unavailable', title: 'Price is unavailable', description: 'Keep a source record visible when its price is missing.' },
  { id: 'location-denied', title: 'Location is unavailable', description: 'Continue with a manually chosen search area.' },
  { id: 'refresh-failed', title: 'A refresh failed', description: 'Show a useful recovery path when a source check fails.' },
];

type ChainCoverage = {
  id: string;
  offerCount: number;
  categories: Map<string, number>;
};

export default function StateGalleryScreen() {
  const router = useRouter();
  const boardQuery = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();

  const boardRecords = boardQuery.status === 'success' ? boardQuery.data : EMPTY_RECORDS;
  const recentRecords = recentQuery.status === 'success' ? recentQuery.data : EMPTY_RECORDS;
  const coverage = summarizeCoverage(recentRecords);
  const boardChains = new Set(boardRecords.map(({ chain }) => chain.id)).size;
  const boardLocations = new Set(boardRecords.map(({ location }) => location.id)).size;

  return (
    <AppFrame active="Roost">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>CHICKENOMICAL · RECOVERY GUIDE</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>When a comparison hits a snag</Text>
          <Text style={styles.heroDescription}>
            These previews explain common recovery states. The coverage below comes from the connected Convex database.
          </Text>
          <View accessibilityElementsHidden style={styles.heroWave}>
            <View style={styles.waveDot} />
            <View style={styles.waveLine} />
            <View style={styles.waveDotSmall} />
            <View style={styles.waveLine} />
            <View style={styles.waveDot} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionCopy}>
              <Text style={styles.eyebrow}>CONNECTED CONVEX DATA</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>The latest board</Text>
            </View>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, boardQuery.status === 'error' && styles.errorDot]} />
              <Text style={styles.liveLabel}>{boardQuery.status === 'loading' ? 'LOADING' : boardQuery.status === 'error' ? 'UNAVAILABLE' : 'LIVE'}</Text>
            </View>
          </View>

          <QueryStatePanel status={boardQuery.status} error={boardQuery.status === 'error' ? boardQuery.error : undefined} />
          {boardQuery.status === 'success' ? (
            <View style={[styles.snapshotCard, boardQuery.metadata.job?.status === 'failed' && styles.snapshotFailed]}>
              <View style={styles.snapshotTop}>
                <Text style={styles.cardEyebrow}>CURRENT BOARD SNAPSHOT</Text>
                <Text style={styles.snapshotStatus}>{boardQuery.metadata.job?.status ?? 'recent records'}</Text>
              </View>
              <Text style={styles.snapshotHeadline}>{boardQuery.metadata.offer_count} offers returned</Text>
              <Text style={styles.snapshotDescription}>
                {boardQuery.metadata.query.address?.trim() || 'No location recorded'}
                {boardQuery.metadata.query.radius_miles == null ? '' : ` · ${boardQuery.metadata.query.radius_miles} mi radius`}
              </Text>
              <View style={styles.metricsRow}>
                <Metric label="CHAINS" value={String(boardChains)} tone="lime" />
                <Metric label="LOCATIONS" value={String(boardLocations)} tone="sky" />
                <Metric label="OBSERVED" value={formatObservedAt(boardQuery.metadata.observed_at)} tone="plain" />
              </View>
              {boardQuery.metadata.job?.status === 'failed' && boardQuery.metadata.job.error ? (
                <Text style={styles.snapshotError}>{boardQuery.metadata.job.error}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.coverageSection}>
            <View style={styles.sectionCopy}>
              <Text style={styles.eyebrow}>DATABASE DEFINES THE COVERAGE</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Chains and categories</Text>
            </View>
            <Text style={styles.coverageIntro}>Grouped from the latest 200-record query. Names and counts below are read from Convex.</Text>
            <QueryStatePanel status={recentQuery.status} error={recentQuery.status === 'error' ? recentQuery.error : undefined} />
            {recentQuery.status === 'success' && coverage.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No recent menu offers returned</Text>
                <Text style={styles.emptyCopy}>The recent-offers query is connected, but it returned no records to group by chain or category.</Text>
              </View>
            ) : null}
            {recentQuery.status === 'success' && coverage.length > 0 ? (
              <View style={styles.coverageList}>
                {coverage.map((chain, index) => (
                  <View key={chain.id} style={[styles.coverageCard, index % 3 === 1 && styles.coverageSky, index % 3 === 2 && styles.coverageLime]}>
                    <View style={styles.coverageTop}>
                      <Text style={styles.chainName}>{formatName(chain.id)}</Text>
                      <Text style={styles.offerCount}>{chain.offerCount} {chain.offerCount === 1 ? 'offer' : 'offers'}</Text>
                    </View>
                    <Text style={styles.categoriesLabel}>CATEGORIES IN THESE RECORDS</Text>
                    <View style={styles.categoryList}>
                      {[...chain.categories.entries()]
                        .sort(([first], [second]) => first.localeCompare(second))
                        .map(([category, count]) => (
                          <View key={category} style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{category}</Text>
                            <Text style={styles.categoryCount}>{count}</Text>
                          </View>
                        ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {recentQuery.status === 'success' && coverage.length > 0 ? (
              <Text style={styles.coverageFootnote}>
                Recent query returned {recentRecords.length} records. A chain or category appears here only when it is present in those database rows.
              </Text>
            ) : null}
          </View>

          <View style={styles.previewsHeading}>
            <View style={styles.sectionCopy}>
              <Text style={styles.eyebrow}>EXPLANATORY PREVIEWS</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Try a recovery state</Text>
            </View>
            <Text style={styles.previewNote}>Local examples · not live DB states</Text>
          </View>
          <View style={styles.list}>
            {SCENARIOS.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="link"
                onPress={() => router.push('/states/' + item.id as never)}
                style={({ pressed }) => [styles.row, index % 3 === 1 && styles.blueRow, index % 3 === 2 && styles.limeRow, pressed && styles.pressed]}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
                <Text style={styles.arrow}>Preview →</Text>
              </Pressable>
            ))}
          </View>
          <ActionButton onPress={() => router.push('/' as never)}>Return to Compare</ActionButton>
        </View>
      </View>
    </AppFrame>
  );
}

function summarizeCoverage(records: OfferRecord[]): ChainCoverage[] {
  const byChain = new Map<string, ChainCoverage>();
  for (const { chain, offer } of records) {
    let summary = byChain.get(chain.id);
    if (!summary) {
      summary = { id: chain.id, offerCount: 0, categories: new Map<string, number>() };
      byChain.set(chain.id, summary);
    }
    summary.offerCount += 1;
    const category = offer.category?.trim() || 'Uncategorized';
    summary.categories.set(category, (summary.categories.get(category) ?? 0) + 1);
  }
  return [...byChain.values()].sort((first, second) => first.id.localeCompare(second.id));
}

function formatName(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatObservedAt(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'lime' | 'sky' | 'plain' }) {
  return (
    <View style={[styles.metric, tone === 'lime' ? styles.metricLime : tone === 'sky' ? styles.metricSky : styles.metricPlain]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const EMPTY_RECORDS: OfferRecord[] = [];

const styles = StyleSheet.create({
  screen: { width: '100%', gap: spacing.xl },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.orange, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: spacing.xl, paddingBottom: 42, gap: spacing.sm },
  heroEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, lineHeight: 15, letterSpacing: 0.8 },
  heroTitle: { maxWidth: 640, color: colors.black, fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9 },
  heroDescription: { maxWidth: 620, color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  heroWave: { position: 'absolute', bottom: 14, left: 22, right: 22, height: 9, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.52 },
  waveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cream },
  waveDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cream },
  waveLine: { height: 2, flex: 1, borderRadius: 2, backgroundColor: colors.cream },
  content: { gap: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionCopy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
  sectionTitle: { color: colors.orange, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.purpleSoft },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#36804B' },
  errorDot: { backgroundColor: colors.danger },
  liveLabel: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.45 },
  snapshotCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, gap: spacing.sm },
  snapshotFailed: { backgroundColor: colors.paleDanger, borderColor: colors.danger },
  snapshotTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardEyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.65 },
  snapshotStatus: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, textTransform: 'capitalize' },
  snapshotHeadline: { color: colors.black, fontFamily: fonts.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.4 },
  snapshotDescription: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  metric: { flex: 1, minWidth: 88, minHeight: 62, justifyContent: 'space-between', borderRadius: radii.md, padding: spacing.sm },
  metricLime: { backgroundColor: colors.lime },
  metricSky: { backgroundColor: colors.sky },
  metricPlain: { backgroundColor: colors.cream },
  metricLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.45 },
  metricValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 12 },
  snapshotError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  coverageSection: { gap: spacing.sm },
  coverageIntro: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  coverageList: { gap: spacing.sm },
  coverageCard: { gap: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.lg, padding: spacing.md },
  coverageSky: { backgroundColor: colors.sky, borderColor: colors.blueStrong },
  coverageLime: { backgroundColor: colors.lime, borderColor: colors.lime },
  coverageTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  chainName: { flex: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  offerCount: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  categoriesLabel: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, borderRadius: radii.pill, paddingHorizontal: spacing.sm, backgroundColor: colors.cream },
  categoryText: { color: colors.black, fontFamily: fonts.medium, fontSize: 11 },
  categoryCount: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10 },
  coverageFootnote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  emptyCard: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.sky },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  emptyCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  previewsHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  previewNote: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 16 },
  list: { gap: spacing.sm },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.md, backgroundColor: colors.white },
  blueRow: { backgroundColor: colors.sky, borderColor: colors.blueStrong },
  limeRow: { backgroundColor: colors.lime, borderColor: colors.lime },
  pressed: { opacity: 0.62 },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  description: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  arrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 11 },
});
