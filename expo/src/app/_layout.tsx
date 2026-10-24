import '../global.css';

import { OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PrototypeProvider } from '@/state/prototype-context';
import { colors } from '@/theme';

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
      </Stack>
    </PrototypeProvider>
  );
}
