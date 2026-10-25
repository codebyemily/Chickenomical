import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

export default function CompareStackLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: Platform.OS === 'web' ? 'none' : undefined }} />;
}
