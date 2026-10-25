import Head from 'expo-router/head';

export function WebAppleStatusBar() {
  return (
    <Head>
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Chickenomical" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </Head>
  );
}
