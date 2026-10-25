import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Chickenomical | Nearby chicken menu comparisons</title>
        <meta name="description" content="Compare recent chicken menu prices, pack sizes, locations, and source records." />
        <meta name="application-name" content="Chickenomical" />
        <meta name="apple-mobile-web-app-title" content="Chickenomical" />
        <link rel="icon" type="image/svg+xml" href="/chickenomical.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        {/* The visual reference intentionally uses the same light surface in both OS themes. */}
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f1f2f2" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#f1f2f2" />
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
