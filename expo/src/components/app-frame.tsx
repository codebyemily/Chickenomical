import { useRouter, useSegments } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme';

const NAV_ITEMS = [
  { label: 'Compare', href: '/' },
  { label: 'Data sources', href: '/sources' },
  { label: 'Method', href: '/methodology' },
  { label: 'Preview states', href: '/states' },
];

type AppFrameProps = PropsWithChildren<{ active?: string }>;

export function AppFrame({ children, active = '' }: AppFrameProps) {
  const router = useRouter();
  const web = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setWide(width >= 980);
  }, [width]);

  const nav = (
    <View style={[styles.nav, wide ? styles.navVertical : styles.navHorizontal]}>
      {NAV_ITEMS.map((item) => {
        const selected = active === item.label;
        return (
          <Pressable
            key={item.href}
            accessibilityRole="link"
            accessibilityState={{ selected }}
            onPress={() => router.push(item.href as never)}
            style={({ pressed }) => [styles.navButton, selected && styles.navSelected, pressed && styles.pressed]}>
            <Text style={[styles.navText, selected && styles.navTextSelected]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.root}>
        {web ? (
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerLabel}>PROTOTYPE DATA</Text>
            <Text style={styles.disclaimerText}>All prices, locations, and source details here are synthetic.</Text>
          </View>
        ) : (
          <View style={styles.nativeDisclaimer}>
            <Text style={styles.nativeDisclaimerText}>SYNTHETIC DEMO · Prices and sources are not live</Text>
          </View>
        )}
        <View style={[styles.workspace, !wide && styles.workspaceNarrow]}>
          {web && wide ? (
            <View style={styles.sidebar}>
              <View style={styles.brandBlock}>
                <Text style={styles.brand}>CHICKENOMICAL</Text>
                <Text style={styles.brandSub}>NEARBY VALUE · DEMO</Text>
              </View>
              {nav}
              <View style={styles.sidebarRule} />
              <Text style={styles.sidebarNote}>Pickup only</Text>
              <Text style={styles.sidebarNote}>No sign-in or checkout</Text>
              <Text style={styles.sidebarNote}>Local mock data</Text>
            </View>
          ) : null}
          <View style={styles.contentColumn}>
            {web && !wide ? (
              <View style={styles.mobileHeader}>
                <View style={styles.mobileBrandLine}>
                  <Text style={styles.brand}>CHICKENOMICAL</Text>
                  <Text style={styles.brandSub}>DEMO</Text>
                </View>
                {nav}
              </View>
            ) : null}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={[styles.main, wide && styles.mainWide]}>
                {children}
                {web ? <View style={styles.footer}>
                  <View style={styles.rule} />
                  <Text style={styles.footerText}>
                    Chickenomical prototype · no live menu connection · no sign-in · no checkout
                  </Text>
                </View> : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function PageHeading({ title, description }: { title: string; description?: string }) {
  const segments: string[] = useSegments() as string[];
  const nativeStackTitle = Platform.OS !== 'web' && !segments.includes('(tabs)');
  return (
    <View style={styles.pageHeading}>
      {!nativeStackTitle ? <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text> : null}
      {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
    </View>
  );
}

export function SectionHeading({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {trailing ? <Text style={styles.sectionTrailing}>{trailing}</Text> : null}
    </View>
  );
}

export function HardRule() {
  return <View style={styles.rule} />;
}

export function NoticeBand({ title, children, tone = 'neutral' }: PropsWithChildren<{ title: string; tone?: 'neutral' | 'warning' | 'error' }>) {
  const style = tone === 'error' ? styles.errorBand : tone === 'warning' ? styles.warningBand : styles.neutralBand;
  return (
    <View style={[styles.noticeBand, style]}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.gray },
  root: { flex: 1, backgroundColor: colors.gray },
  disclaimer: {
    minHeight: 48,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  disclaimerLabel: { color: colors.white, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  disclaimerText: { color: colors.white, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, flex: 1 },
  nativeDisclaimer: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.black,
  },
  nativeDisclaimerText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.55 },
  workspace: { flex: 1, flexDirection: 'row' },
  workspaceNarrow: { flexDirection: 'column' },
  contentColumn: { flex: 1, minHeight: 0 },
  sidebar: {
    width: 246,
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.rule,
  },
  brandBlock: { marginBottom: spacing.xl },
  brand: { color: colors.black, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 0.5 },
  brandSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.1, marginTop: 4 },
  nav: { gap: 4 },
  navVertical: { flexDirection: 'column' },
  navHorizontal: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', gap: 8, marginTop: spacing.md },
  navButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  navSelected: { borderBottomColor: colors.black },
  navText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  navTextSelected: { color: colors.black, fontFamily: fonts.bold },
  pressed: { opacity: 0.68 },
  sidebarRule: { height: 1, backgroundColor: colors.rule, marginVertical: spacing.lg },
  sidebarNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 20 },
  mobileHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  mobileBrandLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.md, paddingBottom: spacing.xl, alignItems: 'center' },
  main: { width: '100%', maxWidth: 760, gap: spacing.lg },
  mainWide: { maxWidth: 1020, paddingTop: spacing.lg },
  pageHeading: { gap: spacing.xs },
  pageTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: Platform.OS === 'web' ? 32 : 26, lineHeight: Platform.OS === 'web' ? 38 : 32, letterSpacing: -0.5 },
  pageDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: Platform.OS === 'web' ? 15 : 14, lineHeight: Platform.OS === 'web' ? 23 : 21, maxWidth: 680 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.black },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  sectionTrailing: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  rule: { height: 1, backgroundColor: colors.rule, width: '100%' },
  footer: { gap: spacing.md, marginTop: spacing.xl, paddingBottom: spacing.lg },
  footerText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  noticeBand: { padding: spacing.md, gap: 5, borderWidth: 1, borderColor: colors.rule },
  neutralBand: { backgroundColor: colors.white },
  warningBand: { backgroundColor: colors.paleWarning, borderColor: '#B48B4C' },
  errorBand: { backgroundColor: '#F3E4E4', borderColor: '#A64A4A' },
  noticeTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  noticeText: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
});
