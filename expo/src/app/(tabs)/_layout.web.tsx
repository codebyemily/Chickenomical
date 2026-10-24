import { Stack } from 'expo-router';

export default function WebTabLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
