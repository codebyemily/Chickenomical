import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, PageHeading, SectionHeading } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, radii, spacing } from '@/theme';

const SCENARIOS = [
  { id: 'loading', title: 'Incubating comparison', description: 'A first visit while the clutch is still hatching.' },
  { id: 'no-locations', title: 'Empty nest', description: 'No demo roosts in this search area. The flock flew the coop.' },
  { id: 'no-comparable', title: 'Nothing to crow about', description: 'Nearby records lack fields needed for comparable unit prices.' },
  { id: 'stale-only', title: 'Leftover sample prices', description: 'These leftovers need a recheck before anyone pecks.' },
  { id: 'incomplete', title: 'Half-hatched menu data', description: 'The exact offer quantity is missing.' },
  { id: 'unavailable', title: 'Missing list price', description: 'The source did not return a list_price_cents value.' },
  { id: 'location-denied', title: 'Chicken-out on location', description: 'A user chickens out of GPS and can search by roost name.' },
  { id: 'refresh-failed', title: 'Hatch failure', description: 'A source hatch fails while last-known birds remain in the nest.' },
];

export default function StateGalleryScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Roost">
      <PageHeading title="Preview every fowl-up." description="These screens make the recovery path and data limits reviewable before any live coop is connected. When the sky is falling, you'll know what to do." />
      <SectionHeading title="User-facing fowl-ups" trailing="LOCAL PREVIEWS" />
      <View style={styles.list}>
        {SCENARIOS.map((item) => (
          <Pressable key={item.id} accessibilityRole="link" onPress={() => router.push('/states/' + item.id as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.copy}><Text style={styles.name}>{item.title}</Text><Text style={styles.description}>{item.description}</Text></View>
            <Text style={styles.arrow}>Chick it out →</Text>
          </Pressable>
        ))}
      </View>
      <ActionButton onPress={() => router.push('/' as never)}>Return to the pecking order</ActionButton>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.sm, backgroundColor: colors.white },
  pressed: { opacity: 0.62 },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.black, fontFamily: fonts.bold, fontSize: 14 },
  description: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  arrow: { color: colors.black, fontFamily: fonts.bold, fontSize: 11 },
});
