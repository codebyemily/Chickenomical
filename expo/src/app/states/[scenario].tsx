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
    title: 'Incubating nearby offers.', intro: 'Incubation preview', stateTitle: 'Warming the clutch',
    message: 'The comparison reads nearby offers through a local Convex-shaped query. The fixtures resolve after a short mock delay; no backend request runs.', tone: 'neutral',
    actions: [{ label: 'View the pecking order', href: '/' }, { label: 'View the coop', href: '/sources' }],
  },
  'no-locations': {
    title: 'Empty nest.', intro: 'Empty nest state', stateTitle: 'The flock flew the coop',
    message: 'There are no sample roosts for this search. Move the search area or stretch the coop radius. Why did the chicken cross the road? There was nothing on this side.', tone: 'warning',
    actions: [{ label: 'Choose another roost', href: '/location' }, { label: 'Preview the pecking order', href: '/' }],
  },
  'no-comparable': {
    title: 'Nothing to crow about.', intro: 'Unrankable offers', stateTitle: 'No comparable offers to rank',
    message: 'Nearby menu rows may be missing a quantity, list price, or verified status. Only comparable à la carte pickup offers with those fields can enter the unit-price ranking.', tone: 'warning',
    actions: [{ label: 'Chick out an incomplete row', href: '/offer/wendys-uncounted-tenders' }, { label: 'Review the rules of the roost', href: '/methodology' }],
  },
  'stale-only': {
    title: 'These leftovers need a recheck.', intro: 'Leftover data state', stateTitle: 'Not a spring chicken',
    message: 'This sample offer has an older observed_at timestamp. It remains inspectable with a stale label so a user can see its age before relying on it.', tone: 'warning',
    actions: [{ label: 'Review the coop', href: '/sources' }, { label: 'See a leftover offer', href: '/offer/mcd-6-nuggets' }],
  },
  incomplete: {
    title: 'This clutch is half-hatched.', intro: 'Half-hatched record', stateTitle: 'Don\'t count this chicken',
    message: 'The sample tender offer has a list price but no exact quantity. Without quantity, the app cannot calculate a meaningful price per unit.', tone: 'warning',
    actions: [{ label: 'Chick out the half-hatched record', href: '/offer/wendys-uncounted-tenders' }, { label: 'Rules of the roost', href: '/methodology' }],
  },
  unavailable: {
    title: 'The price flew the coop.', intro: 'Missing list price', stateTitle: 'No list price returned',
    message: 'This local offer has a quantity but no list_price_cents value. It stays visible for context and cannot enter comparison or quantity solving.', tone: 'warning',
    actions: [{ label: 'Chick out the empty perch', href: '/offer/bk-nuggets-unavailable' }, { label: 'View the pecking order', href: '/' }],
  },
  'location-denied': {
    title: 'Don\'t chicken out — pick a roost.', intro: 'Chicken-out recovery', stateTitle: 'You chickened out of GPS',
    message: 'You can type an address or pick a sample roost instead. This preview does not request device or browser location permission. The chicken can still cross the road by hand.', tone: 'neutral',
    actions: [{ label: 'Name a roost', href: '/location' }, { label: 'Use a sample roost', href: '/location' }],
  },
  'refresh-failed': {
    title: 'The hatch failed.', intro: 'Hatch failure', stateTitle: 'The last clutch is still in the nest',
    message: 'A failed query should keep prior results available, label their age, and offer a retry. This preview sets the local refresh state to failed; the existing mock records remain in the source ledger.', tone: 'error',
    actions: [{ label: 'Retry the hatch', href: '/sources' }, { label: 'Return to the pecking order', href: '/' }],
  },
};

export default function ScenarioScreen() {
  const { scenario } = useLocalSearchParams<{ scenario: string }>();
  const router = useRouter();
  const state = SCENARIOS[scenario];
  const { runMockRefresh } = usePrototype();

  if (!state) return <AppFrame active="Roost"><PageHeading title="This fowl-up flew the coop." /><ActionButton kind="primary" onPress={() => router.replace('/states' as never)}>Back to the fowl-ups</ActionButton></AppFrame>;

  return (
    <AppFrame active="Roost">
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
        <Text style={styles.noteTitle}>Why this fowl-up exists</Text>
        <Text style={styles.noteBody}>Users should know what the app could verify, what flew the coop, and the next useful peck. This state uses sample copy only and does not reflect a live connection. That&apos;s no yolk.</Text>
      </View>
      <ActionButton kind="text" onPress={() => router.push('/states' as never)}>Back to every fowl-up</ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 200 },
  loadingRows: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  loadingLine: { height: 12, width: '88%', backgroundColor: colors.gray },
  shortLine: { width: '56%' },
  recoveryNote: { borderLeftWidth: 4, borderLeftColor: colors.black, paddingLeft: spacing.md, gap: spacing.xs },
  noteTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  noteBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
});
