import '../global.css';

import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinkPressable } from '@/components/link-pressable';
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

  if (!fontsLoaded && !fontError) return null;

  return (
    <PrototypeProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: Platform.OS !== 'web',
          contentStyle: { backgroundColor: colors.gray },
          headerStyle: { backgroundColor: colors.gray },
          headerTintColor: colors.black,
          headerTitleStyle: { color: colors.black, fontFamily: fonts.medium, fontSize: 17 },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ title: 'Search area' }} />
        <Stack.Screen name="offer/[id]" options={{ title: 'Offer details' }} />
        <Stack.Screen name="source/[id]" options={{ title: 'Source record' }} />
        <Stack.Screen name="states/index" options={{ title: 'Recovery states' }} />
        <Stack.Screen name="states/[scenario]" options={{ title: 'State preview' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />
      </Stack>
    </PrototypeProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.errorSafe}>
      <StatusBar style="light" />
      <View style={styles.errorContent}>
        <Text style={styles.errorEyebrow}>SCREEN UNAVAILABLE</Text>
        <Text accessibilityRole="header" style={styles.errorTitle}>This screen couldn’t load.</Text>
        <Text style={styles.errorMessage}>The screen hit a snag. Try it again, or head back to Compare.</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <LinkPressable href="/" replace style={styles.homeButton}>
          <Text style={styles.homeText}>Back to Compare</Text>
        </LinkPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorSafe: { flex: 1, backgroundColor: colors.black },
  errorContent: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorEyebrow: { color: colors.yellow, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
  errorTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 30, lineHeight: 37 },
  errorMessage: { color: '#E7E7E7', fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, marginBottom: spacing.md },
  retryButton: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: radii.pill, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  retryText: { color: colors.black, fontFamily: fonts.bold, fontSize: 15 },
  homeButton: { alignItems: 'center', borderColor: '#777777', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  homeText: { color: colors.white, fontFamily: fonts.medium, fontSize: 14 },
});
