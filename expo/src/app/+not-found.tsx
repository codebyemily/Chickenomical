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
        title="This page flew the coop."
        description="That address doesn't match a Chickenomical screen. Head back to the pecking order to keep comparing the sample flock."
      />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>NO SUCH ROOST</Text>
        <Text style={styles.note}>Your sample offers are still safe in their local nest.</Text>
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
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
  note: { color: colors.black, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
});
