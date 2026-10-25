import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { AppFrame, BackLink } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { QueryStatePanel } from '@/components/query-state-panel';
import { useStoredOffersQuery, type OfferRecord } from '@/data/live-offers';
import { decorative } from '@/lib/a11y';
import { isRankable } from '@/lib/compare';
import { colors, fonts, radii, spacing } from '@/theme';
import { pageMetadata } from '@/data/page-metadata';
import type { GenerateMetadataFunction } from 'expo-router/server';

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'How chicken comparisons work',
  'Learn how Chickenomical checks menu prices, pack sizes, source freshness, and comparable offers.',
);

const RULES = [
  { title: 'Start with the latest menu update', body: 'Each offer includes when it was seen and the location reported with the menu. A newer update can replace older prices as it arrives.' },
  { title: 'Match offers with the same basics', body: 'Chicken type, pack size, ordering channel, and currency stay together. That keeps one piece or pack from being compared with a different kind of order.' },
  { title: 'Compare the listed menu price', body: 'Totals use the listed price before tax, delivery, and other checkout fees. They are estimates from recent menus, not a live order quote. The two picks can come from different pickup menus, and each card names that channel. Delivery prices stay out of those picks.' },
  { title: 'Divide the price by the stated quantity', body: 'Price per piece uses the listed total divided by the number of pieces in the pack. We keep the original pack and price visible so you can check the math.' },
  { title: 'Measure distance', body: 'Your location, or a place you type, is matched to each restaurant. The nearest ones inside the chosen distance are the ones compared. The search bar changes the food, not that point. This is a map distance, not driving time.' },
  { title: 'Keep the source close to the price', body: 'Open an offer to review its provider, link, store, and update time before relying on it.' },
  { title: 'Keep offers that cannot be ranked', body: 'Offers with missing prices, quantities, or comparison details remain available to inspect. We leave them out of price-per-piece rankings until the missing information is present.' },
];

export default function MethodologyScreen() {
  const query = useStoredOffersQuery();
  const records = query.status === 'success' ? query.data : EMPTY_RECORDS;
  const chains = new Set(records.map(({ chain }) => chain.id)).size;
  const locations = new Set(records.map(({ location }) => location.id)).size;
  const providers = new Set(records.map(({ offer }) => offer.source_provider.trim()).filter(Boolean)).size;
  const priced = records.filter(({ offer }) => offer.list_price_cents != null).length;
  const comparable = records.filter(({ offer }) => isRankable(offer)).length;

  return (
    <AppFrame active="Method" edgeToEdgeTop nativeSurface="compare" surface="compare" showDataNotice={false}>
      <View style={styles.screen}>
        <View style={[styles.hero, Platform.OS !== 'web' && styles.heroNative, Platform.OS === 'web' && styles.heroWeb]}>
          <BackLink label="Back to Compare" tone="orange" />
          <HeadingText level={1} style={styles.heroTitle}>How each comparison works</HeadingText>
          <Text style={styles.heroDescription}>Live menu offers, clear price math, and a source you can check before ordering.</Text>
          <View {...decorative} style={styles.heroWave}>
            <View style={styles.waveDot} />
            <View style={styles.waveLine} />
            <View style={styles.waveDotSmall} />
            <View style={styles.waveLine} />
            <View style={styles.waveDot} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.liveHeading}>
            <View style={styles.liveHeadingCopy}>
              <HeadingText level={2} style={styles.sectionTitle}>This board right now</HeadingText>
            </View>
            {query.status === 'loading' ? <ActivityIndicator color={colors.purple} /> : null}
          </View>

          {query.status === 'loading' ? (
            <QueryStatePanel status="loading" />
          ) : null}

          {query.status === 'error' ? (
            <QueryStatePanel status="error" />
          ) : null}

          {query.status === 'success' ? (
            <>
              <View style={styles.snapshotCard}>
                <View style={styles.snapshotTop}>
                  <View style={styles.snapshotTitleGroup}>
                    <View style={[styles.statusDot, statusTone(query.metadata.job?.status)]} />
                  </View>
                  <Text style={styles.snapshotStatus}>{jobStatus(query.metadata.job?.status)}</Text>
                </View>
                <Text style={styles.snapshotDescription}>
                  {query.metadata.job
                    ? `${query.metadata.query.address?.trim() || 'Location not selected'}${query.metadata.query.radius_miles == null ? '' : ` - ${query.metadata.query.radius_miles} mi radius`}`
                    : 'Showing recent menu offers from the latest update.'}
                </Text>
                <View style={styles.snapshotDivider} />
                <Text style={styles.snapshotMeta}>Offers updated {formatObservedAt(query.metadata.observed_at)}</Text>
                {query.metadata.job?.completed_at ? (
                  <Text style={styles.snapshotMeta}>Update completed {formatObservedAt(query.metadata.job.completed_at)}</Text>
                ) : null}
                {query.metadata.job?.status === 'running' ? (
                  <Text style={styles.snapshotNote}>This can update as new offers arrive.</Text>
                ) : null}
                {query.metadata.job?.status === 'failed' ? (
                  <Text style={styles.snapshotError}>The latest menu update did not finish. Any offers shown here may be from an earlier update.</Text>
                ) : null}
              </View>

              <View style={styles.metricsGrid}>
                <MetricCard label="OFFERS" value={String(query.metadata.offer_count)} tone="lime" />
                <MetricCard label="STORES" value={String(locations)} tone="sky" />
                <MetricCard label="RESTAURANTS" value={String(chains)} tone="plain" />
                <MetricCard label="SOURCES" value={String(providers)} tone="plain" />
              </View>
              <Text style={styles.coverageNote}>
                {`${comparable} ready for comparison - ${priced} with a listed price - counts cover the offers currently available.`}
              </Text>

              {records.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No offers in this board yet</Text>
                  <Text style={styles.emptyCopy}>No menu offers were included in this update. Try again after another update.</Text>
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.rulesHeading}>
            <HeadingText level={2} style={styles.sectionTitle}>What each result means</HeadingText>
          </View>
          {RULES.map((rule, index) => (
            <View key={rule.title} style={styles.ruleCard}>
              <View style={styles.ruleTop}>
                <View style={styles.ruleNumber}><Text style={styles.ruleNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <HeadingText level={3} style={styles.ruleTitle}>{rule.title}</HeadingText>
              </View>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          ))}

          <View style={styles.mathBlock}>
            <Text style={styles.mathFormula}>listed price ÷ pieces in the pack</Text>
            <Text style={styles.mathFormula}>lowest comparable total at one location</Text>
          </View>

        </View>
      </View>
    </AppFrame>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'lime' | 'sky' | 'plain' }) {
  return (
    <View style={[styles.metricCard, tone === 'lime' ? styles.metricLime : tone === 'sky' ? styles.metricSky : styles.metricPlain]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function jobStatus(status?: string) {
  if (!status) return 'Latest offers';
  if (status === 'running') return 'Updating';
  if (status === 'succeeded') return 'Up to date';
  if (status === 'failed') return 'Needs an update';
  return 'Updating';
}

function statusTone(status?: string) {
  if (status === 'running') return styles.statusDotRunning;
  if (status === 'failed') return styles.statusDotFailed;
  if (status === 'succeeded') return styles.statusDotComplete;
  return styles.statusDotIdle;
}

function formatObservedAt(value: string | null) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const EMPTY_RECORDS: OfferRecord[] = [];

const styles = StyleSheet.create({
  screen: { width: '100%', gap: spacing.xl },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.orange, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 42, gap: spacing.sm },
  heroNative: { marginHorizontal: -spacing.lg, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  heroWeb: { marginHorizontal: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9 },
  heroDescription: { maxWidth: 580, color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  heroWave: { position: 'absolute', bottom: 14, left: 22, right: 22, height: 9, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.52 },
  waveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cream },
  waveDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cream },
  waveLine: { height: 2, flex: 1, borderRadius: 2, backgroundColor: colors.cream },
  content: { gap: spacing.lg },
  liveHeading: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  liveHeadingCopy: { gap: 2 },
  sectionTitle: { color: colors.orangeInk, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  snapshotCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, gap: spacing.sm },
  snapshotTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  snapshotTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusDotIdle: { backgroundColor: colors.muted },
  statusDotComplete: { backgroundColor: colors.statusGreen },
  statusDotRunning: { backgroundColor: colors.warning },
  statusDotFailed: { backgroundColor: colors.danger },
  snapshotStatus: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  snapshotDescription: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  snapshotDivider: { height: 1, backgroundColor: colors.warmRule, marginVertical: spacing.xs },
  snapshotMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  snapshotNote: { color: colors.black, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  snapshotError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: { flexBasis: '48%', flexGrow: 1, minWidth: 125, minHeight: 74, borderRadius: radii.md, padding: spacing.md, justifyContent: 'space-between' },
  metricLime: { backgroundColor: colors.lime },
  metricSky: { backgroundColor: colors.sky },
  metricPlain: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule },
  metricLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, lineHeight: 13, letterSpacing: 0.55 },
  metricValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 25, lineHeight: 28 },
  coverageNote: { marginTop: -spacing.sm, color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  emptyState: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.sky, gap: spacing.xs },
  emptyTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  emptyCopy: { color: colors.black, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  rulesHeading: { gap: 2, paddingTop: spacing.md },
  ruleCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, gap: spacing.md },
  ruleTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  ruleNumberText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10 },
  ruleTitle: { flex: 1, color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  ruleBody: { color: colors.black, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  mathBlock: { backgroundColor: colors.black, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  mathFormula: { color: colors.white, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
});
