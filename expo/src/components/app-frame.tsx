import { usePathname, useSegments } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { colors, fonts, radii, spacing } from '@/theme';

const NAV_ITEMS = [
  { label: 'Compare', href: '/' },
  { label: 'Group', href: '/quantity' },
  { label: 'Sources', href: '/sources' },
  { label: 'Method', href: '/methodology' },
];

type AppFrameProps = PropsWithChildren<{
  active?: string;
  compact?: boolean;
  showDataNotice?: boolean;
  surface?: 'default' | 'compare';
}>;

export function AppFrame({ children, compact = false, showDataNotice = true, surface = 'default' }: AppFrameProps) {
  const web = Platform.OS === 'web';
  const compareSurface = surface === 'compare';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const nativeStack = !web && !segments.includes('(tabs)');

  return (
    <SafeAreaView edges={nativeStack ? ['left', 'right'] : ['top', 'left', 'right']} style={[styles.safeArea, compareSurface && styles.compareSafeArea]}>
      {web ? <WebNavigation /> : null}
      <ScrollView
        testID="app-scroll"
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width >= 900 ? spacing.xxxl : spacing.lg,
            paddingBottom: web ? Math.max(insets.bottom, spacing.xl) : Math.max(insets.bottom, spacing.md) + 104 },
          compareSurface && styles.compareScrollContent,
        ]}
        keyboardShouldPersistTaps="handled">
        <View role={web ? 'main' : undefined} style={[styles.main, compact && styles.mainCompact, compareSurface && styles.compareMain]}>
          {!compareSurface && showDataNotice ? (
            <View style={styles.dataNotice}>
              <Text style={styles.dataNoticeLabel}>CONVEX MENU DATA</Text>
              <Text style={styles.dataNoticeText}>Recent scraped records · check source and timestamp before ordering</Text>
            </View>
          ) : null}
          {children}
          <View style={[styles.footer, compareSurface && styles.compareFooter]}>
            {compareSurface ? (
              <Text style={[styles.footerText, styles.compareFooterText]}>Menu prices are before tax and fees. Open a source to verify before ordering.</Text>
            ) : (
              <>
                <Text style={styles.footerText}>CHICKENOMICAL / RECENT MENU RECORDS</Text>
                <Text style={styles.footerText}>PRICE BEFORE TAX & FEES · SOURCE CHANNEL SHOWN</Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WebNavigation() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.navWrap}>
      <View role="navigation" accessibilityLabel="Main navigation" style={styles.nav}>
        <LinkPressable href="/" accessibilityLabel="Chickenomical home" style={({ pressed }) => [styles.brandLink, pressed && styles.pressed]}>
          <Text accessibilityElementsHidden style={styles.brandEmoji}>🐔</Text>
          <Text style={styles.brandName}>chickenomical</Text>
        </LinkPressable>
        <View style={styles.navLinks}>
          {NAV_ITEMS.map((item) => {
            const selected = pathname === item.href
              || (item.href === '/' && pathname.startsWith('/category/'))
              || (item.href === '/sources' && pathname.startsWith('/source/'))
              || (item.href === '/' && (pathname.startsWith('/offer/') || pathname === '/location'))
              || (item.href === '/methodology' && pathname.startsWith('/states'));
            return (
              <LinkPressable
                key={item.href}
                href={item.href as never}
                {...{ 'aria-current': selected ? 'page' as const : undefined }}
                style={({ pressed }) => [styles.navButton, width < 900 && styles.navButtonNarrow, selected && styles.navSelected, pressed && styles.pressed]}>
                <Text style={[styles.navText, selected && styles.navTextSelected]}>{item.label}</Text>
              </LinkPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function PageHeading({ title, description, compact = false, tone = 'orange' }: { title: string; description?: string; compact?: boolean; tone?: 'orange' | 'lime' | 'blue' }) {
  const segments = useSegments() as string[];
  const { width } = useWindowDimensions();
  const nativeStackTitle = Platform.OS !== 'web' && !segments.includes('(tabs)');

  if (nativeStackTitle) {
    return description ? <Text style={styles.pageDescription}>{description}</Text> : null;
  }

  return (
    <View style={[styles.masthead, width < 720 && styles.mastheadNarrow, compact && styles.mastheadCompact]}>
      <View style={[styles.brandMark, compact && styles.brandMarkCompact]} accessibilityLabel="Chickenomical">
        <Text style={styles.brandMarkText}>C<Text style={styles.brandSlash}>/</Text></Text>
      </View>
      <View style={styles.headingCopy}>
        <Text style={styles.eyebrow}>CHICKENOMICAL / FIELD REPORT</Text>
        <HeadingText level={1} style={[styles.pageTitle, tone === 'orange' && styles.pageTitleOrange, tone === 'lime' && styles.pageTitleLime, tone === 'blue' && styles.pageTitleBlue, width < 600 && styles.pageTitleNarrow, compact && styles.pageTitleCompact]}>{title}</HeadingText>
        {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
      </View>
      <View style={[styles.reportMeta, width < 720 && styles.reportMetaNarrow]}>
        <View style={styles.freshness}>
          <View style={styles.sampleDot} />
          <Text style={styles.freshnessText}>DATABASE SNAPSHOT</Text>
        </View>
      </View>
    </View>
  );
}

export function SectionHeading({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <HeadingText level={2} style={styles.sectionTitle}>{title}</HeadingText>
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
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : undefined}
      style={[styles.noticeBand, style]}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  compareSafeArea: { backgroundColor: colors.orange },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.xl, alignItems: 'center', backgroundColor: colors.cream },
  compareScrollContent: { paddingHorizontal: 0, paddingTop: 0, backgroundColor: colors.cream },
  main: { width: '100%', maxWidth: 1360, gap: spacing.xl },
  mainCompact: { gap: spacing.md },
  compareMain: { gap: 0 },
  dataNotice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  dataNoticeLabel: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  dataNoticeText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  masthead: { flexDirection: 'row', gap: 18, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.black, paddingBottom: 28 },
  mastheadNarrow: { flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.lg },
  mastheadCompact: { gap: spacing.sm, paddingBottom: spacing.sm, rowGap: spacing.sm },
  brandMark: { width: 52, height: 52, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' },
  brandMarkCompact: { width: 36, height: 36 },
  brandMarkText: { color: colors.yellow, fontFamily: fonts.monoBold, fontSize: 28, letterSpacing: -4 },
  brandSlash: { color: colors.white },
  headingCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  eyebrow: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  pageTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 40, lineHeight: 43, letterSpacing: -1.5 },
  pageTitleOrange: { color: colors.orangeInk },
  pageTitleLime: { color: '#688B20' },
  pageTitleBlue: { color: '#27899F' },
  pageTitleNarrow: { fontSize: 27, lineHeight: 30, letterSpacing: -0.9 },
  pageTitleCompact: { fontSize: 21, lineHeight: 25, letterSpacing: -0.55 },
  pageDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, maxWidth: 760 },
  reportMeta: { alignItems: 'flex-end', gap: spacing.sm },
  reportMetaNarrow: { width: '100%', alignItems: 'flex-start', gap: spacing.md },
  freshness: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  sampleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  freshnessText: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.2 },
  navWrap: { width: '100%', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.cream },
  nav: { width: '100%', maxWidth: 1360, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  brandLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  brandEmoji: { fontSize: 19, lineHeight: 24 },
  brandName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, letterSpacing: -0.35 },
  navLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  navButton: { minHeight: 48, minWidth: 72, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: spacing.xs },
  navButtonNarrow: { minHeight: 48, minWidth: 66 },
  navSelected: { borderBottomColor: colors.black },
  navText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  navTextSelected: { color: colors.black, fontFamily: fonts.bold },
  pressed: { opacity: 0.65 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.black },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, flexShrink: 1, letterSpacing: -0.5 },
  sectionTrailing: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.35, textTransform: 'uppercase' },
  rule: { height: 1, backgroundColor: colors.rule, width: '100%' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.sm },
  compareFooter: { marginTop: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: '#2E252C' },
  footerText: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 17 },
  compareFooterText: { color: colors.white, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  noticeBand: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md },
  neutralBand: { backgroundColor: colors.white },
  warningBand: { backgroundColor: colors.paleWarning, borderColor: colors.warning },
  errorBand: { backgroundColor: colors.paleDanger, borderColor: colors.danger },
  noticeTitle: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  noticeText: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
});
