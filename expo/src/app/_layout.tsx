import '../global.css';

import { OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { Stack, useRouter } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrototypeProvider } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFonts({ OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold });

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <PrototypeProvider>
      <StatusBar style={Platform.OS === 'web' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: Platform.OS !== 'web',
          contentStyle: { backgroundColor: colors.gray },
          animation: 'slide_from_right',
          headerStyle: { backgroundColor: colors.black },
          headerTintColor: colors.yellow,
          headerTitleStyle: { color: colors.white, fontWeight: '600' },
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
  const router = useRouter();

  return (
    <SafeAreaView style={styles.errorSafe}>
      <StatusBar style="light" />
      <View style={styles.errorContent}>
        <Text style={styles.errorEyebrow}>THE ROOST WOBBLED</Text>
        <Text accessibilityRole="header" style={styles.errorTitle}>This screen needs a quick re-hatch.</Text>
        <Text style={styles.errorMessage}>The screen hit a snag. Try it again, or head back to Compare.</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/' as never)} style={styles.homeButton}>
          <Text style={styles.homeText}>Back to Compare</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorSafe: { flex: 1, backgroundColor: colors.black },
  errorContent: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorEyebrow: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  errorTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 30, lineHeight: 37 },
  errorMessage: { color: '#E7E7E7', fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, marginBottom: spacing.md },
  retryButton: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: radii.pill, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  retryText: { color: colors.black, fontFamily: fonts.bold, fontSize: 15 },
  homeButton: { alignItems: 'center', borderColor: '#777777', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  homeText: { color: colors.white, fontFamily: fonts.medium, fontSize: 14 },
});
