import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '@/theme';

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Chickenomical | Nearby chicken menu comparisons</title>
        <meta name="description" content="Compare recent chicken menu prices, pack sizes, locations, and sources." />
        <meta name="application-name" content="Chickenomical" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chickenomical" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/png" sizes="48x48" href="/chickenomical.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        {/* The browser chrome follows the dark footer in both OS themes. */}
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={colors.footerInk} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={colors.footerInk} />
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
