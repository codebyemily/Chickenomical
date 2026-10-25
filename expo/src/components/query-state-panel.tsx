import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NoticeBand } from '@/components/app-frame';
import { colors, fonts, spacing } from '@/theme';

type QueryState = 'loading' | 'success' | 'error';

export function QueryStatePanel({
  status,
  error,
  onRetry,
}: {
  status: QueryState;
  error?: Error;
  onRetry?: () => void;
}) {
  if (status === 'success') return null;
  if (status === 'loading') {
    return (
      <View accessibilityRole="progressbar" style={styles.loading}>
        <ActivityIndicator color={colors.black} />
        <Text style={styles.loadingText}>Loading menu offers from Convex…</Text>
      </View>
    );
  }
  return (
    <View style={styles.error}>
      <NoticeBand title="Could not read menu offers" tone="error">
        {error?.message ?? 'The Convex query did not return.'}
      </NoticeBand>
      {onRetry ? <Text accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>Retry query</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  error: { gap: spacing.md, alignItems: 'flex-start' },
  retryButton: { color: colors.black, fontFamily: fonts.bold, fontSize: 14, textDecorationLine: 'underline', paddingVertical: spacing.sm },
});
