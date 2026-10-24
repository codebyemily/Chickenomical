import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, PageHeading, SectionHeading } from '@/components/app-frame';
import { LinkPressable } from '@/components/link-pressable';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, radii, spacing } from '@/theme';

const SCENARIOS = [
  { id: 'loading', title: 'Loading comparison', description: 'A first visit while nearby offers are being prepared.' },
  { id: 'no-locations', title: 'No nearby locations', description: 'The selected area has no sample restaurant coverage.' },
  { id: 'no-comparable', title: 'No comparable prices', description: 'Nearby items lack a usable price or stated piece count.' },
  { id: 'stale-only', title: 'Stale prices', description: 'Older records stay visible with a recheck label.' },
  { id: 'incomplete', title: 'Incomplete menu data', description: 'A price or piece count is missing.' },
  { id: 'unavailable', title: 'Unavailable item', description: 'A menu item is excluded from comparisons.' },
  { id: 'location-denied', title: 'Location access declined', description: 'A typed address offers another way to search.' },
  { id: 'refresh-failed', title: 'Source refresh failed', description: 'Existing records remain available during recovery.' },
];

export default function StateGalleryScreen() {
  const router = useRouter();
  return (
    <AppFrame active="Method">
      <PageHeading title="A useful next step, every time." description="Review the empty, unavailable, and recovery states for the comparison flow." />
      <SectionHeading title="Recovery states" trailing="LOCAL PREVIEWS" />
      <View style={styles.list}>
        {SCENARIOS.map((item) => (
          <LinkPressable key={item.id} href={{ pathname: '/states/[scenario]', params: { scenario: item.id } }} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.copy}><Text style={styles.name}>{item.title}</Text><Text style={styles.description}>{item.description}</Text></View>
            <Text style={styles.arrow}>View ↗</Text>
          </LinkPressable>
        ))}
      </View>
      <ActionButton onPress={() => router.push('/' as never)}>Return to Compare</ActionButton>
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
