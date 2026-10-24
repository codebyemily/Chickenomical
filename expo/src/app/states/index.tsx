import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, spacing } from '@/theme';

const SCENARIOS = [
  { id: 'loading', title: 'Loading comparison', description: 'A first visit while results are being prepared.' },
  { id: 'no-locations', title: 'No nearby locations', description: 'No demo coverage is available for the selected search area.' },
  { id: 'no-comparable', title: 'No comparable prices', description: 'Locations exist, but eligible counted prices do not.' },
  { id: 'stale-only', title: 'Stale sample prices', description: 'Results are old and need a source recheck.' },
  { id: 'incomplete', title: 'Incomplete menu data', description: 'Piece count or price is missing from a candidate.' },
  { id: 'unavailable', title: 'Item unavailable', description: 'A location reports a menu item as unavailable.' },
  { id: 'location-denied', title: 'Location permission denied', description: 'A user declines location access and can search manually.' },
  { id: 'refresh-failed', title: 'Refresh failure', description: 'A source update fails while last-known results remain.' },
];

export default function StateGalleryScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Preview states">
      <PageHeading title="Preview every edge state." description="These screens make the recovery path and data limits reviewable before any live source is connected." />
      <SectionHeading title="User-facing states" trailing="LOCAL PREVIEWS" />
      <View style={styles.list}>
        {SCENARIOS.map((item) => (
          <Pressable key={item.id} accessibilityRole="link" onPress={() => router.push('/states/' + item.id as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.copy}><Text style={styles.name}>{item.title}</Text><Text style={styles.description}>{item.description}</Text></View>
            <Text style={styles.arrow}>Preview →</Text>
          </Pressable>
        ))}
      </View>
      <ActionButton onPress={() => router.push('/' as never)}>Return to comparison</ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  list: { borderTopWidth: 1, borderTopColor: colors.black },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  pressed: { opacity: 0.62 },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  description: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  arrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 11 },
});
