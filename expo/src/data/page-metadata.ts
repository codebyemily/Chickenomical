import type { Metadata } from 'expo-router/server';

const APP_NAME = 'Chickenomical';

export function pageMetadata(title: string, description: string): Metadata {
  return {
    title: `${title} | ${APP_NAME}`,
    description,
    applicationName: APP_NAME,
    appleWebApp: { title: APP_NAME, statusBarStyle: 'default' },
  };
}
