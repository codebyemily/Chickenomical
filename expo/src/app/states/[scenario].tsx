import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

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
    title: 'Finding nearby offers.', intro: 'Loading preview', stateTitle: 'Preparing the comparison',
    message: 'Nearby menu records would appear here once the comparison is ready. This is a static preview using local sample data.', tone: 'neutral',
    actions: [{ label: 'View offers', href: '/' }, { label: 'View sources', href: '/sources' }],
  },
  'no-locations': {
    title: 'No offers in this area.', intro: 'No nearby locations', stateTitle: 'Try another search origin',
    message: 'There are no sample locations for this search. Choose another area or increase the radius to see more nearby offers.', tone: 'warning',
    actions: [{ label: 'Change search area', href: '/location' }, { label: 'View sample offers', href: '/' }],
  },
  'no-comparable': {
    title: 'No comparable prices yet.', intro: 'No eligible offers', stateTitle: 'A count and price are required',
    message: 'Nearby items may be missing a piece count or usable pickup price. Only standalone items with both fields can enter the comparison.', tone: 'warning',
    actions: [{ label: 'Inspect sample item', href: '/offer/wendys-uncounted-tenders' }, { label: 'Read comparison rules', href: '/methodology' }],
  },
  'stale-only': {
    title: 'These prices need a recheck.', intro: 'Stale data preview', stateTitle: 'Check the source before ordering',
    message: 'This illustrative offer was marked as checked four days ago. Older records remain visible with an explicit label so their age stays clear.', tone: 'warning',
    actions: [{ label: 'Review sources', href: '/sources' }, { label: 'Inspect stale offer', href: '/offer/mcd-6-nuggets' }],
  },
  incomplete: {
    title: 'This item is missing a count.', intro: 'Incomplete record', stateTitle: 'Excluded from the comparison',
    message: 'The sample tender item has a price but no stated piece count. A price per piece cannot be calculated until the count is available.', tone: 'warning',
    actions: [{ label: 'Inspect sample item', href: '/offer/wendys-uncounted-tenders' }, { label: 'Read comparison rules', href: '/methodology' }],
  },
  unavailable: {
    title: 'This item is unavailable.', intro: 'Unavailable item', stateTitle: 'Other offers are still available',
    message: 'Unavailable items remain inspectable for context and are excluded from rankings and group orders. Compare other eligible menu items nearby.', tone: 'warning',
    actions: [{ label: 'Inspect unavailable item', href: '/offer/bk-nuggets-unavailable' }, { label: 'View offers', href: '/' }],
  },
  'location-denied': {
    title: 'Search with an address instead.', intro: 'Location access declined', stateTitle: 'Choose an area manually',
    message: 'Enter an address or choose a sample area to continue. This preview simulates declined access and does not request device location permission.', tone: 'neutral',
    actions: [{ label: 'Enter an address', href: '/location' }, { label: 'Choose a sample area', href: '/location' }],
  },
  'refresh-failed': {
    title: 'The source could not refresh.', intro: 'Refresh failure', stateTitle: 'Previous results remain visible',
    message: 'Keep the existing records available while the source recovers. Their age and status remain visible. You can retry the simulated refresh from Sources.', tone: 'error',
    actions: [{ label: 'Retry refresh', href: '/sources' }, { label: 'Return to Compare', href: '/' }],
  },
};

export default function ScenarioScreen() {
  const { scenario } = useLocalSearchParams<{ scenario: string }>();
  const router = useRouter();
  const state = SCENARIOS[scenario];
  const { runMockRefresh } = usePrototype();

  if (!state) return <AppFrame active="Method"><PageHeading title="Preview not found." /><ActionButton kind="primary" onPress={() => router.replace('/states' as never)}>View recovery states</ActionButton></AppFrame>;

  return (
    <AppFrame active="Method">
      <Text style={styles.eyebrow}>{state.intro.toUpperCase()}</Text>
      <PageHeading title={state.title} />
      <NoticeBand title={state.stateTitle} tone={state.tone}>{state.message}</NoticeBand>
      <View style={styles.actions}>
        {state.actions.map((action, index) => (
          <View key={action.label} style={styles.action}>
            <ActionButton kind={index === 0 ? 'primary' : 'secondary'} onPress={() => {
              if (scenario === 'refresh-failed' && action.href === '/sources') runMockRefresh('failed');
              router.push(action.href as never);
            }}>{action.label}</ActionButton>
          </View>
        ))}
      </View>
      {scenario === 'loading' ? <View style={styles.loadingRows}><View style={styles.loadingLine} /><View style={[styles.loadingLine, styles.shortLine]} /><View style={styles.loadingLine} /></View> : null}
      <View style={styles.recoveryNote}>
        <Text style={styles.noteTitle}>About this preview</Text>
        <Text style={styles.noteBody}>Each state explains the data limit and offers a useful next action. These are local examples and do not indicate a live service status.</Text>
      </View>
      <ActionButton kind="text" onPress={() => router.push('/states' as never)}>All recovery states</ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 180 },
  loadingRows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, padding: spacing.lg, gap: spacing.lg },
  loadingLine: { height: 12, width: '88%', backgroundColor: colors.gray },
  shortLine: { width: '56%' },
  recoveryNote: { borderLeftWidth: 3, borderLeftColor: colors.black, paddingLeft: spacing.lg, gap: spacing.xs },
  noteTitle: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16 },
  noteBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
});
