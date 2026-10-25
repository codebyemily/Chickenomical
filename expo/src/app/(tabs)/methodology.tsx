import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppFrame } from '@/components/app-frame';
import { QueryStatePanel } from '@/components/query-state-panel';
import { ActionButton } from '@/components/ui/action-button';
import { useLiveOffersQuery, type OfferRecord } from '@/data/live-offers';
import { isRankable } from '@/lib/compare';
import { colors, fonts, radii, spacing } from '@/theme';

const RULES = [
  { title: 'Read the latest board snapshot', body: 'This screen subscribes to offers:board. The board uses the requested scrape job, or the newest job when no job ID is supplied. It scans up to 500 newest menuOffers rows; when a job has a requested_at time, it keeps rows whose observed_at is on or after that time. The backend groups returned rows by chain and store.' },
  { title: 'Compare the fields each offer stores', body: 'Each menu offer can include category, offer kind, quantity, list price, channel, currency, prep, heat, build, cut mix, and protein details. Most are strings or nullable values, so the schema does not enforce a fixed category or variant vocabulary.' },
  { title: 'Keep channels and prices explicit', body: 'Each menu offer stores its ordering channel, currency, and list price. The schema has no fee, tax, tip, or discount fields, so the app compares the stored list price and does not calculate an out-the-door total.' },
  { title: 'Divide list price by quantity', body: 'Unit price is list_price_cents divided by a known quantity. The app rounds only the displayed result. Each row also carries its location, source provider, source item, source URL, and observed time for inspection.' },
  { title: 'Treat distance as a saved estimate', body: 'distance_miles is stored with the menu offer or its store grouping. It is not a live distance calculation; a null value means distance is unavailable for that row.' },
  { title: 'Use menu offers only', body: 'The connected schema has menuOffers, numbers, and scrapeJobs tables. It has no deals table or structured deal schedule and conditions, so this app compares offers returned from menuOffers.' },
  { title: 'Leave uncertain records visible', body: 'Rows without a usable quantity or list price, or with comparable set to false, stay inspectable and out of unit-price comparison. observed_at records when an offer was seen; the timestamp alone does not guarantee that its price is still current.' },
];

export default function MethodologyScreen() {
  const router = useRouter();
  const query = useLiveOffersQuery();
  const records = query.status === 'success' ? query.data : EMPTY_RECORDS;
  const chains = new Set(records.map(({ chain }) => chain.id)).size;
  const locations = new Set(records.map(({ location }) => location.id)).size;
  const providers = new Set(records.map(({ offer }) => offer.source_provider.trim()).filter(Boolean)).size;
  const priced = records.filter(({ offer }) => offer.list_price_cents != null).length;
  const comparable = records.filter(({ offer }) => isRankable(offer)).length;

  return (
    <AppFrame active="Method">
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>CHICKENOMICAL · THE METHOD</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>How each comparison works</Text>
          <Text style={styles.heroDescription}>Live menu records, clear price math, and a source trail you can check before ordering.</Text>
          <View accessibilityElementsHidden style={styles.heroWave}>
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
              <Text style={styles.sectionEyebrow}>CONNECTED CONVEX DATA</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>This board right now</Text>
            </View>
            {query.status === 'loading' ? <ActivityIndicator color={colors.purple} /> : null}
          </View>

          {query.status === 'loading' ? (
            <QueryStatePanel status="loading" />
          ) : null}

          {query.status === 'error' ? (
            <QueryStatePanel status="error" error={query.error} />
          ) : null}

          {query.status === 'success' ? (
            <>
              <View style={[styles.snapshotCard, query.metadata.job?.status === 'failed' && styles.snapshotCardFailed]}>
                <View style={styles.snapshotTop}>
                  <View style={styles.snapshotTitleGroup}>
                    <View style={[styles.statusDot, statusTone(query.metadata.job?.status)]} />
                    <Text style={styles.snapshotEyebrow}>LIVE BOARD SNAPSHOT</Text>
                  </View>
                  <Text style={styles.snapshotStatus}>{jobStatus(query.metadata.job?.status)}</Text>
                </View>
                <Text style={styles.snapshotDescription}>
                  {query.metadata.job
                    ? `${query.metadata.query.address?.trim() || 'Location not recorded'}${query.metadata.query.radius_miles == null ? '' : ` · ${query.metadata.query.radius_miles} mi radius`}`
                    : 'Showing the bounded recent menu-offer scan; no scrape job is attached to this board.'}
                </Text>
                <View style={styles.snapshotDivider} />
                <Text style={styles.snapshotMeta}>Board observed {formatObservedAt(query.metadata.observed_at)}</Text>
                {query.metadata.job?.completed_at ? (
                  <Text style={styles.snapshotMeta}>Job completed {formatObservedAt(query.metadata.job.completed_at)}</Text>
                ) : null}
                {query.metadata.job?.status === 'running' ? (
                  <Text style={styles.snapshotNote}>The Convex board subscription can update as records arrive.</Text>
                ) : null}
                {query.metadata.job?.status === 'failed' && query.metadata.job.error ? (
                  <Text style={styles.snapshotError}>{query.metadata.job.error}</Text>
                ) : null}
              </View>

              <View style={styles.metricsGrid}>
                <MetricCard label="BOARD OFFERS" value={String(query.metadata.offer_count)} tone="lime" />
                <MetricCard label="STORES" value={String(locations)} tone="sky" />
                <MetricCard label="CHAINS" value={String(chains)} tone="plain" />
                <MetricCard label="SOURCE PROVIDERS" value={String(providers)} tone="plain" />
              </View>
              <Text style={styles.coverageNote}>
                {comparable} rankable · {priced} with a list price · counts describe this returned board, not every row stored in Convex.
              </Text>

              {records.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No offers in this board yet</Text>
                  <Text style={styles.emptyCopy}>The connection is working, but offers:board returned no menu offers for its current job or recent scan.</Text>
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.rulesHeading}>
            <Text style={styles.sectionEyebrow}>PRICE RULES</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>What each result means</Text>
          </View>
          {RULES.map((rule, index) => (
            <View key={rule.title} style={styles.ruleCard}>
              <View style={styles.ruleTop}>
                <View style={styles.ruleNumber}><Text style={styles.ruleNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <Text accessibilityRole="header" style={styles.ruleTitle}>{rule.title}</Text>
              </View>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          ))}

          <View style={styles.mathBlock}>
            <Text style={styles.mathLabel}>PRICE PER CATEGORY UNIT</Text>
            <Text style={styles.mathFormula}>list_price_cents ÷ quantity</Text>
            <Text style={styles.mathLabel}>QUANTITY GOAL</Text>
            <Text style={styles.mathFormula}>lowest comparable total at one location</Text>
          </View>

          <ActionButton kind="secondary" onPress={() => router.push('/states' as never)}>
            Preview every fowl-up
          </ActionButton>
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
  if (!status) return 'Recent board';
  if (status === 'running') return 'Scrape running';
  if (status === 'succeeded') return 'Scrape completed';
  if (status === 'failed') return 'Scrape failed';
  return `Scrape ${status}`;
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
  heroEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9 },
  heroDescription: { maxWidth: 580, color: colors.black, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  heroWave: { position: 'absolute', bottom: 14, left: 22, right: 22, height: 9, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.52 },
  waveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cream },
  waveDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cream },
  waveLine: { height: 2, flex: 1, borderRadius: 2, backgroundColor: colors.cream },
  content: { gap: spacing.lg },
  liveHeading: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  liveHeadingCopy: { gap: 2 },
  sectionEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
  sectionTitle: { color: colors.orange, fontFamily: fonts.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  snapshotCard: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, gap: spacing.sm },
  snapshotCardFailed: { borderColor: colors.danger, backgroundColor: colors.paleDanger },
  snapshotTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  snapshotTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusDotIdle: { backgroundColor: colors.muted },
  statusDotComplete: { backgroundColor: '#36804B' },
  statusDotRunning: { backgroundColor: colors.warning },
  statusDotFailed: { backgroundColor: colors.danger },
  snapshotEyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.7 },
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
  mathLabel: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8, marginTop: spacing.sm },
  mathFormula: { color: colors.white, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
});
