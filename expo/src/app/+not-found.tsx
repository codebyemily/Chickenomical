import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppFrame, PageHeading } from '@/components/app-frame';
import { colors, fonts, radii, spacing } from '@/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <AppFrame active="Compare">
      <PageHeading
        title="Page not found."
        description="This address does not match a Chickenomical screen. Return to Compare to browse the sample offers."
      />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>UNKNOWN ADDRESS</Text>
        <Text style={styles.note}>The comparison board is still available.</Text>
        <ActionButton kind="primary" onPress={() => router.replace('/' as never)}>
          Back to compare
        </ActionButton>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.rule,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 1 },
  note: { color: colors.black, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
});
