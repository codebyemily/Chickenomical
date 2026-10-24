import '../global.css';

import { OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PrototypeProvider } from '@/state/prototype-context';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.gray }} />;

  return (
    <PrototypeProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: Platform.OS !== 'web',
          contentStyle: { backgroundColor: colors.gray },
          animation: 'slide_from_right',
          headerTintColor: colors.black,
          headerTitleStyle: { color: colors.black, fontWeight: '600' },
          headerBackTitle: 'Back',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ title: 'Search area' }} />
        <Stack.Screen name="offer/[id]" options={{ title: 'Offer details' }} />
        <Stack.Screen name="source/[id]" options={{ title: 'Source record' }} />
        <Stack.Screen name="states/index" options={{ title: 'Recovery states' }} />
        <Stack.Screen name="states/[scenario]" options={{ title: 'Preview state' }} />
      </Stack>
    </PrototypeProvider>
  );
}
