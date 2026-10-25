import '../global.css';

import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ConvexProvider } from 'convex/react';

import { AppFrame } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { WebAppleStatusBar } from '@/components/web-apple-status-bar';
import { ActionButton } from '@/components/ui/action-button';
import { convexClient } from '@/data/convex-client';
import { PrototypeProvider } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <WebAppleStatusBar />;

  if (!convexClient) {
    return (
      <>
        <WebAppleStatusBar />
        <View style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>Chickenomical is temporarily unavailable.</Text>
          <Text style={styles.errorMessage}>Menu data couldn’t be loaded. Please try again later.</Text>
        </View>
      </>
    );
  }

  return (
    <ConvexProvider client={convexClient}>
      <PrototypeProvider>
        <WebAppleStatusBar />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'web' ? 'none' : undefined,
            statusBarStyle: 'dark',
            contentStyle: { backgroundColor: colors.cream },
            headerStyle: { backgroundColor: colors.cream },
            headerTintColor: colors.black,
            headerTitleStyle: { color: colors.black, fontFamily: fonts.medium, fontSize: 17 },
            headerShadowVisible: false,
            headerBackTitle: 'Back',
          }}>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              statusBarStyle: 'dark',
            }}
          />
          <Stack.Screen name="location" options={{ title: 'Distance filter' }} />
          <Stack.Screen name="offer/[id]" options={{ title: 'Offer details' }} />
          <Stack.Screen name="source/[id]" options={{ title: 'Source details' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />
        </Stack>
      </PrototypeProvider>
    </ConvexProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <AppFrame showDataNotice={false}>
      <View style={styles.errorContent}>
        <HeadingText level={1} style={styles.errorTitle}>This screen couldn’t load.</HeadingText>
        <Text style={styles.errorMessage}>The screen hit a snag. Try it again, or head back to the live comparison.</Text>
        <ActionButton kind="primary" onPress={retry}>Try again</ActionButton>
        <LinkPressable href="/" replace style={styles.homeButton}>
          <Text style={styles.homeText}>Back to Compare</Text>
        </LinkPressable>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  unavailable: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.cream },
  unavailableTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  errorContent: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 30, lineHeight: 37 },
  errorMessage: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, marginBottom: spacing.md },
  homeButton: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: radii.pill, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  homeText: { color: colors.purple, fontFamily: fonts.medium, fontSize: 14 },
});
