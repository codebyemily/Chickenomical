import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { useLiveOffersQuery, useRecentOffersQuery, type OfferRecord } from '@/data/live-offers';
import { colors, fonts, radii, spacing, tabular } from '@/theme';

type Scenario = {
  title: string;
  intro: string;
  stateTitle: string;
  message: string;
  tone: 'neutral' | 'warning' | 'error';
  actions: { label: string; href: string }[];
};

const SCENARIOS: Record<string, Scenario> = {
  loading: {
    title: 'Offers are still hatching.', intro: 'Loading preview', stateTitle: 'A first look takes a moment',
    message: 'This preview shows how the app should explain a pending comparison. The offer and chain counts below come from the live Convex snapshot.', tone: 'neutral',
    actions: [{ label: 'Open live comparisons', href: '/' }, { label: 'Browse live records', href: '/sources' }],
  },
  'no-locations': {
    title: 'No nearby offers yet.', intro: 'Empty results preview', stateTitle: 'Nothing in this search area',
    message: 'This preview demonstrates the empty-results recovery path. Change the search area or radius to look for other locations; the current database coverage is shown below.', tone: 'warning',
    actions: [{ label: 'Change search area', href: '/location' }, { label: 'Open live comparisons', href: '/' }],
  },
  'no-comparable': {
    title: 'Nothing to rank yet.', intro: 'Unrankable offers preview', stateTitle: 'No comparable offers to rank',
    message: 'A menu row needs an exact quantity and list price, plus a comparable status, before it can enter a unit-price ranking. This is a recovery preview; the live records below show what Convex currently has.', tone: 'warning',
    actions: [{ label: 'Review live records', href: '/sources' }, { label: 'Review comparison rules', href: '/methodology' }],
  },
  'stale-only': {
    title: 'These records need a recheck.', intro: 'Stale-data preview', stateTitle: 'The snapshot may be old',
    message: 'This preview shows how an older observation should be labeled before anyone relies on it. Check the live observation time and source details below.', tone: 'warning',
    actions: [{ label: 'Review live sources', href: '/sources' }, { label: 'Open comparison rules', href: '/methodology' }],
  },
  incomplete: {
    title: 'A menu record is incomplete.', intro: 'Incomplete-record preview', stateTitle: 'Quantity is missing',
    message: 'Without an exact quantity, the app cannot calculate a meaningful price per unit. This preview does not claim that a particular live record is incomplete; browse the Convex records to inspect their current fields.', tone: 'warning',
    actions: [{ label: 'Browse live records', href: '/sources' }, { label: 'Review comparison rules', href: '/methodology' }],
  },
  unavailable: {
    title: 'A price is unavailable.', intro: 'Missing-price preview', stateTitle: 'No list price returned',
    message: 'A record without a list price can stay visible for context but cannot be ranked or used in quantity solving. This is an explanatory preview, not a claim about a specific live offer.', tone: 'warning',
    actions: [{ label: 'Browse live records', href: '/sources' }, { label: 'Open live comparisons', href: '/' }],
  },
  'location-denied': {
    title: 'Pick a search area.', intro: 'Location-permission preview', stateTitle: 'Location was not shared',
    message: 'A user can enter an address or choose a search area instead. This preview does not request device location permission.', tone: 'neutral',
    actions: [{ label: 'Choose a search area', href: '/location' }, { label: 'Browse live comparisons', href: '/' }],
  },
  'refresh-failed': {
    title: 'The latest check did not finish.', intro: 'Refresh-failure preview', stateTitle: 'Keep the last good snapshot visible',
    message: 'A failed refresh should explain what happened, preserve any available records, and let people inspect their age and source. This screen previews that recovery message; it does not change the scrape job.', tone: 'error',
    actions: [{ label: 'Inspect live sources', href: '/sources' }, { label: 'Return to comparisons', href: '/' }],
  },
};

export default function ScenarioScreen() {
  const { scenario } = useLocalSearchParams<{ scenario: string }>();
  const router = useRouter();
  const state = SCENARIOS[scenario];
  const liveQuery = useLiveOffersQuery();
  const recentQuery = useRecentOffersQuery();

  if (!state) {
    return (
      <AppFrame active="Explore">
        <PageHeading tone="orange" title="This page flew the coop." description="That recovery preview is not available." />
        <ActionButton kind="primary" onPress={() => router.replace('/states' as never)}>Back to recovery previews</ActionButton>
      </AppFrame>
    );
  }

  const records = liveQuery.status === 'success' ? liveQuery.data : [];
  const chainNames = uniqueSorted(records.map(({ chain }) => chain.name || chain.id));
  const categories = uniqueSorted(records.map(({ offer }) => offer.category ?? 'Uncategorized'));
  const recentRecords = recentQuery.status === 'success' ? recentQuery.data : [];
  const latestObservedAt = latestObservation(records);

  return (
    <AppFrame active="Explore">
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>CHICKENOMICAL / RECOVERY PREVIEW</Text>
        <Text style={styles.heroTitle}>{state.title}</Text>
        <Text style={styles.heroIntro}>{state.intro}</Text>
      </View>

      <NoticeBand title={state.stateTitle} tone={state.tone}>{state.message}</NoticeBand>

      <View style={styles.snapshot}>
        <View style={styles.snapshotHeading}>
          <Text style={styles.snapshotEyebrow}>LIVE CONVEX SNAPSHOT</Text>
          <Text style={styles.snapshotStatus}>
            {liveQuery.status === 'loading' ? 'Loading' : liveQuery.status === 'error' ? 'Unavailable' : records.length > 0 ? 'Connected' : 'No offers'}
          </Text>
        </View>

        {liveQuery.status === 'loading' ? (
          <View accessibilityRole="progressbar" style={styles.queryState}>
            <ActivityIndicator color={colors.purple} />
            <Text style={styles.queryStateText}>Reading current offers from Convex…</Text>
          </View>
        ) : null}

        {liveQuery.status === 'error' ? (
          <NoticeBand title="Could not load the current snapshot" tone="error">{liveQuery.error.message}</NoticeBand>
        ) : null}

        {liveQuery.status === 'success' && records.length === 0 ? (
          <NoticeBand title="No offers in this Convex result" tone="warning">
            The query returned an empty result. This recovery example remains a preview; it does not add sample chains or menu items.
          </NoticeBand>
        ) : null}

        {liveQuery.status === 'success' && records.length > 0 ? (
          <>
            <View style={styles.stats}>
              <Stat value={String(liveQuery.metadata.offer_count)} label="offers in result" tone="lime" />
              <Stat value={String(chainNames.length)} label="chains in result" tone="sky" />
            </View>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>CHAINS IN CONVEX</Text>
              <Text style={styles.dataValues}>{chainNames.join(' · ') || 'None returned'}</Text>
            </View>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>CATEGORIES IN CONVEX</Text>
              <Text style={styles.dataValues}>{categories.join(' · ') || 'None returned'}</Text>
            </View>
            <View style={styles.dataFootnote}>
              <Text style={styles.footnoteText}>{liveQuery.metadata.job ? `Latest job: ${liveQuery.metadata.job.status}` : 'No scrape job attached to this result'}</Text>
              <Text style={styles.footnoteText}>{latestObservedAt ? `Observed ${formatDate(latestObservedAt)}` : 'Observation time not available'}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.recentLine}>
          {recentQuery.status === 'loading' ? (
            <Text style={styles.recentText}>Loading recent database records…</Text>
          ) : recentQuery.status === 'error' ? (
            <Text style={styles.recentError}>Recent records unavailable: {recentQuery.error.message}</Text>
          ) : (
            <Text style={styles.recentText}>{recentRecords.length} recent records returned from Convex</Text>
          )}
        </View>
      </View>

      <View style={styles.explainer}>
        <Text style={styles.explainerTitle}>About this recovery preview</Text>
        <Text style={styles.explainerBody}>The message above demonstrates a possible app state. The live snapshot is read from Convex, so chains, categories, offers, and observation times shown here reflect the database response.</Text>
      </View>

      <View style={styles.actions}>
        {state.actions.map((action, index) => (
          <View key={action.label} style={styles.action}>
            <ActionButton kind={index === 0 ? 'primary' : 'secondary'} onPress={() => router.push(action.href as never)}>{action.label}</ActionButton>
          </View>
        ))}
      </View>
      <ActionButton kind="text" onPress={() => router.push('/states' as never)}>Back to all recovery previews</ActionButton>
    </AppFrame>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'lime' | 'sky' }) {
  return (
    <View style={[styles.stat, tone === 'lime' ? styles.statLime : styles.statSky]}>
      <Text style={[styles.statValue, tabular]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function latestObservation(records: OfferRecord[]) {
  return records
    .map(({ offer }) => offer.observed_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.orange, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm },
  heroEyebrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.9 },
  heroTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  heroIntro: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  snapshot: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.warmRule, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  snapshotHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  snapshotEyebrow: { color: colors.purple, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6 },
  snapshotStatus: { color: colors.black, backgroundColor: colors.purpleSoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, fontFamily: fonts.bold, fontSize: 11 },
  queryState: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  queryStateText: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, minHeight: 78, borderRadius: radii.md, padding: spacing.md, justifyContent: 'center', gap: spacing.xs },
  statLime: { backgroundColor: colors.lime },
  statSky: { backgroundColor: colors.sky },
  statValue: { color: colors.black, fontFamily: fonts.bold, fontSize: 24 },
  statLabel: { color: colors.black, fontFamily: fonts.medium, fontSize: 12 },
  dataGroup: { gap: spacing.xs },
  dataLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6 },
  dataValues: { color: colors.black, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  dataFootnote: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.warmRule, paddingTop: spacing.sm },
  footnoteText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  recentLine: { borderTopWidth: 1, borderTopColor: colors.warmRule, paddingTop: spacing.sm },
  recentText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  recentError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  explainer: { backgroundColor: colors.sky, borderRadius: radii.md, padding: spacing.lg, gap: spacing.xs },
  explainerTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  explainerBody: { color: colors.black, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 200, flexGrow: 1 },
});
