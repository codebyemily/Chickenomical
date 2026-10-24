import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing } from '@/theme';

type Scenario = {
  title: string;
  intro: string;
  stateTitle: string;
  message: string;
  tone: 'neutral' | 'warning' | 'error';
  actions: Array<{ label: string; href: string }>;
};

const SCENARIOS: Record<string, Scenario> = {
  loading: {
    title: 'Preparing nearby offers.', intro: 'Loading state preview', stateTitle: 'Checking sample records',
    message: 'A real comparison would retrieve nearby source records and calculate eligible per-piece prices. This local preview settles immediately; it does not make a request.', tone: 'neutral',
    actions: [{ label: 'View comparison', href: '/' }, { label: 'View data sources', href: '/sources' }],
  },
  'no-locations': {
    title: 'No nearby locations.', intro: 'Empty coverage state', stateTitle: 'No locations in this area',
    message: 'There are no sample stores for this search. Move the search area or increase the radius to look for nearby coverage.', tone: 'warning',
    actions: [{ label: 'Choose another area', href: '/location' }, { label: 'Preview comparison', href: '/' }],
  },
  'no-comparable': {
    title: 'No comparable prices.', intro: 'Comparable-data empty state', stateTitle: 'No counted pickup price to compare',
    message: 'Nearby menu rows may be missing a piece count or a usable price. Only standalone items with both fields can be ranked.', tone: 'warning',
    actions: [{ label: 'Inspect an incomplete row', href: '/offer/wendys-uncounted-tenders' }, { label: 'Review exclusions', href: '/methodology' }],
  },
  'stale-only': {
    title: 'Sample prices need a recheck.', intro: 'Stale-data state', stateTitle: 'Old sample data',
    message: 'This sample offer was marked as checked 4 days ago. It is still fictional, not live. A real app should make the age clear and avoid presenting stale data as current.', tone: 'warning',
    actions: [{ label: 'Review data sources', href: '/sources' }, { label: 'See a sample stale offer', href: '/offer/mcd-6-nuggets' }],
  },
  incomplete: {
    title: 'Some menu details are missing.', intro: 'Incomplete record state', stateTitle: 'Not enough information to rank',
    message: 'The sample tender row has a price but no stated count. Without the piece count, the app cannot calculate a meaningful price per piece.', tone: 'warning',
    actions: [{ label: 'Inspect incomplete record', href: '/offer/wendys-uncounted-tenders' }, { label: 'How ranking works', href: '/methodology' }],
  },
  unavailable: {
    title: 'This item is unavailable.', intro: 'Unavailable-item state', stateTitle: 'No current sample price',
    message: 'Unavailable items remain visible for context but are excluded from comparison and quantity solving. Other eligible locations can still be compared.', tone: 'warning',
    actions: [{ label: 'Inspect unavailable record', href: '/offer/bk-nuggets-unavailable' }, { label: 'View comparison', href: '/' }],
  },
  'location-denied': {
    title: 'Choose an area to continue.', intro: 'Location permission recovery', stateTitle: 'Location access is off',
    message: 'You can enter an address or pick a sample area instead. This preview does not request device or browser location permission.', tone: 'neutral',
    actions: [{ label: 'Enter an address', href: '/location' }, { label: 'Use a sample area', href: '/location' }],
  },
  'refresh-failed': {
    title: 'We could not refresh source data.', intro: 'Source failure state', stateTitle: 'Last-known rows are still visible',
    message: 'A real source failure should preserve prior results, label their age, and offer a retry. The data source screen simulates success locally; no request occurs.', tone: 'error',
    actions: [{ label: 'Review or retry source refresh', href: '/sources' }, { label: 'Return to comparison', href: '/' }],
  },
};

export default function ScenarioScreen() {
  const { scenario } = useLocalSearchParams<{ scenario: string }>();
  const router = useRouter();
  const state = SCENARIOS[scenario];
  const { runMockRefresh } = usePrototype();

  if (!state) return <AppFrame active="Preview states"><PageHeading title="State not found." /><ActionButton kind="primary" onPress={() => router.replace('/states' as never)}>Back to state gallery</ActionButton></AppFrame>;

  return (
    <AppFrame active="Preview states">
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
        <Text style={styles.noteTitle}>Why this screen exists</Text>
        <Text style={styles.noteBody}>Users should know what the app could verify, what it could not, and the next useful action. This state uses sample copy only and does not reflect a live connection.</Text>
      </View>
      <ActionButton kind="text" onPress={() => router.push('/states' as never)}>Back to all preview states</ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 200 },
  loadingRows: { backgroundColor: colors.white, padding: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.black, gap: spacing.md },
  loadingLine: { height: 12, width: '88%', backgroundColor: colors.gray },
  shortLine: { width: '56%' },
  recoveryNote: { borderLeftWidth: 4, borderLeftColor: colors.black, paddingLeft: spacing.md, gap: spacing.xs },
  noteTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 13 },
  noteBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
});
