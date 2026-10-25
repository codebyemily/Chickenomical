import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

export const convexClient = convexUrl?.trim() ? new ConvexReactClient(convexUrl.trim()) : null;
