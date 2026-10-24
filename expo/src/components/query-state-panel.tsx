import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NoticeBand } from '@/components/app-frame';
import { ActionButton } from '@/components/ui/action-button';
import { colors, fonts, spacing } from '@/theme';

type QueryState = 'loading' | 'success' | 'error';

export function QueryStatePanel({
  status,
  error,
  onRetry,
}: {
  status: QueryState;
  error?: Error;
  onRetry: () => void;
}) {
  if (status === 'success') return null;
  if (status === 'loading') {
    return (
      <View accessibilityRole="progressbar" style={styles.loading}>
        <ActivityIndicator color={colors.black} />
        <Text style={styles.loadingText}>Loading local Convex-shaped sample data…</Text>
      </View>
    );
  }
  return (
    <View style={styles.error}>
      <NoticeBand title="Could not read the local sample data" tone="error">
        {error?.message ?? 'The mock query did not return. Try it again.'}
      </NoticeBand>
      <ActionButton kind="primary" onPress={onRetry}>Retry query</ActionButton>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  error: { gap: spacing.md, alignItems: 'flex-start' },
});
