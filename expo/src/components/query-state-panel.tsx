import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NoticeBand } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, spacing } from '@/theme';

type QueryState = 'loading' | 'success' | 'error';

export function QueryStatePanel({
  status,
  onRetry,
}: {
  status: QueryState;
  onRetry?: () => void;
}) {
  if (status === 'success') return null;
  if (status === 'loading') {
    return (
      <View accessibilityRole="progressbar" style={styles.loading}>
        <ActivityIndicator color={colors.black} />
        <Text style={styles.loadingText}>Loading menu offers…</Text>
      </View>
    );
  }
  return (
    <View style={styles.error}>
      <NoticeBand title="Could not read menu offers" tone="error">
        Menu data is temporarily unavailable. Try again in a moment.
      </NoticeBand>
      {onRetry ? <ActionButton kind="secondary" onPress={onRetry}>Try again</ActionButton> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  error: { gap: spacing.md, alignItems: 'flex-start' },
});
