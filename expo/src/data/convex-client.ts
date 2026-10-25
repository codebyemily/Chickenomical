import Constants from 'expo-constants';
import { ConvexReactClient } from 'convex/react';

const expoExtra = Constants.expoConfig?.extra as { convexUrl?: unknown } | undefined;
const configuredConvexUrl = process.env.EXPO_PUBLIC_CONVEX_URL?.trim();
const appConfigConvexUrl = typeof expoExtra?.convexUrl === 'string' ? expoExtra.convexUrl.trim() : '';
const convexUrl = configuredConvexUrl || appConfigConvexUrl || 'https://focused-chameleon-321.convex.cloud';

export const convexClient = new ConvexReactClient(convexUrl);
