import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type StartNearbyScrapeArgs = {
  address: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
};

export type StartNearbyScrapeResult = {
  jobId: string;
  status: 'running';
};

const expoExtra = Constants.expoConfig?.extra as { scrapeProxyUrl?: unknown } | undefined;
const configuredProxyUrl = process.env.EXPO_PUBLIC_SCRAPE_PROXY_URL?.trim();
const appConfigProxyUrl = typeof expoExtra?.scrapeProxyUrl === 'string' ? expoExtra.scrapeProxyUrl.trim() : '';
const deployedWorkerUrl = 'https://chickenomical-web.quacksire.workers.dev';

export async function startNearbyScrape(args: StartNearbyScrapeArgs): Promise<StartNearbyScrapeResult> {
  const baseUrl = (configuredProxyUrl || appConfigProxyUrl || (Platform.OS === 'web' ? '' : deployedWorkerUrl))
    .replace(/\/+$/, '');

  const endpoint = `${baseUrl}/api/scrape/near`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: args.address,
        latitude: args.latitude,
        longitude: args.longitude,
        radius_miles: args.radiusMiles,
      }),
    });
  } catch {
    throw new Error('Could not start the nearby search. Check your connection and retry.');
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : responseText.trim().slice(0, 200) || 'Could not start the nearby search.';
    throw new Error(message);
  }

  if (!isRecord(payload) || typeof payload.jobId !== 'string' || payload.status !== 'running') {
    throw new Error('The server returned an invalid nearby search response.');
  }

  return { jobId: payload.jobId, status: 'running' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
