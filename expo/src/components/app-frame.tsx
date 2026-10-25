import { usePathname, useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { colors, fonts, radii, spacing } from '@/theme';

const CHICKENOMICAL_ICON = require('../../assets/images/chickenomical.png');

const NAV_ITEMS = [
  { label: 'Compare', href: '/' },
  { label: 'Group', href: '/quantity' },
  { label: 'Sources', href: '/sources' },
  { label: 'Method', href: '/methodology' },
];

type AppFrameProps = PropsWithChildren<{
  active?: string;
  compact?: boolean;
  edgeToEdgeTop?: boolean;
  nativeSurface?: 'default' | 'compare';
  showDataNotice?: boolean;
  surface?: 'default' | 'compare';
}>;

export function AppFrame({ children, compact = false, edgeToEdgeTop = false, nativeSurface = 'default', showDataNotice = true, surface = 'default' }: AppFrameProps) {
  const web = Platform.OS === 'web';
  const fullBleedCompare = surface === 'compare' && (web || nativeSurface !== 'compare');
  const compareSurface = fullBleedCompare || (!web && nativeSurface === 'compare');
  const edgeToEdgeNative = edgeToEdgeTop && !web;
  const { width } = useWindowDimensions();
  const compareScale = compareSurface ? clamp(width / 1040, 0.9, 1.35) : 1;
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={edgeToEdgeNative ? ['left', 'right'] : ['top', 'left', 'right']} style={[styles.safeArea, compareSurface && (web || !edgeToEdgeNative) && styles.compareSafeArea]}>
      {web ? <WebNavigation compareSurface={surface === 'compare'} /> : null}
      <KeyboardAvoidingView style={[styles.scroll, compareSurface && styles.compareScroll]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
      <ScrollView
        testID="app-scroll"
        style={[styles.scroll, compareSurface && styles.compareScroll]}
        contentInsetAdjustmentBehavior={Platform.OS === 'web' ? 'automatic' : 'never'}
        bounces={false}
        alwaysBounceVertical={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width >= 900 ? spacing.xxxl : spacing.lg,
            paddingBottom: 0 },
          edgeToEdgeNative && styles.edgeToEdgeScrollContent,
          fullBleedCompare && styles.compareScrollContent,
        ]}
        keyboardShouldPersistTaps="handled">
        <View
          role={web ? 'main' : undefined}
          style={[styles.main, compact && styles.mainCompact, fullBleedCompare && styles.compareMain, edgeToEdgeNative && styles.edgeToEdgeMain, fullBleedCompare && { maxWidth: width }]}
        >
          {edgeToEdgeNative ? <View pointerEvents="none" style={[styles.edgeTopInset, { height: insets.top, marginHorizontal: width >= 900 ? -spacing.xxxl : -spacing.lg }]} /> : null}
          {!compareSurface && showDataNotice ? (
            <View style={styles.dataNotice}>
              <Text style={styles.dataNoticeText}>Menu prices may change. Verify before ordering.</Text>
            </View>
          ) : null}
          {children}
          {compareSurface ? <View pointerEvents="none" style={styles.compareFooterGap} /> : null}
          <View style={[styles.footer, compareSurface && styles.compareFooter, !web && {
            paddingBottom: Math.max(insets.bottom, spacing.md),
          }, compareSurface && {
            paddingHorizontal: Math.round(spacing.lg * compareScale),
            paddingTop: Math.round(spacing.md * compareScale),
            paddingBottom: Math.max(web ? 0 : insets.bottom, Math.round(spacing.md * compareScale)),
          }, !web && compareSurface && !fullBleedCompare && {
            marginHorizontal: width >= 900 ? -spacing.xxxl : -spacing.lg,
          }]}>
            {compareSurface ? (
              <Text style={[styles.footerText, styles.compareFooterText, { fontSize: Math.round(12 * compareScale), lineHeight: Math.round(18 * compareScale) }]}>Menu prices are before tax and fees. Verify before ordering.</Text>
            ) : (
              <Text style={styles.footerText}>Menu prices are before tax and fees. Verify before ordering.</Text>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WebNavigation({ compareSurface = false }: { compareSurface?: boolean }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compareScale = compareSurface ? clamp(width / 1040, 0.9, 1.35) : 1;
  const navHeight = Math.max(48, Math.round(48 * compareScale));
  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.navWrap, compareSurface && styles.compareNavWrap, compareSurface && { paddingHorizontal: Math.round(spacing.lg * compareScale), paddingTop: Math.round(spacing.sm * compareScale) }]}>
      <View role="navigation" accessibilityLabel="Main navigation" style={[styles.nav, compareSurface && { maxWidth: width, minHeight: navHeight, gap: Math.round(spacing.md * compareScale) }]}>
        <LinkPressable href="/" accessibilityLabel="Chickenomical home" style={({ pressed }) => [styles.brandLink, compareSurface && styles.compareBrandLink, compareSurface && { minHeight: navHeight, gap: Math.round(spacing.xs * compareScale) }, pressed && styles.pressed]}>
          <Image source={CHICKENOMICAL_ICON} accessibilityLabel="Chickenomical logo" style={[styles.brandLogo, compareSurface && { width: Math.round(34 * compareScale), height: Math.round(34 * compareScale) }]} />
          <Text style={[styles.brandName, compareSurface && styles.compareNavText, compareSurface && { fontSize: Math.round(16 * compareScale), lineHeight: Math.round(22 * compareScale) }]}>chickenomical</Text>
        </LinkPressable>
        <View style={[styles.navLinks, compareSurface && { gap: Math.round(spacing.sm * compareScale) }]}>
          {NAV_ITEMS.map((item) => {
            const selected = pathname === item.href
              || (item.href === '/' && pathname.startsWith('/category/'))
              || (item.href === '/sources' && pathname.startsWith('/source/'))
              || (item.href === '/' && (pathname.startsWith('/offer/') || pathname === '/location'));
            return (
              <LinkPressable
                key={item.href}
                href={item.href as never}
                {...{ 'aria-current': selected ? 'page' as const : undefined }}
                style={({ pressed }) => [styles.navButton, width < 900 && styles.navButtonNarrow, compareSurface && styles.compareNavButton, compareSurface && { minHeight: navHeight, minWidth: Math.max(66, Math.round(72 * compareScale)), paddingHorizontal: Math.max(spacing.xs, Math.round(spacing.xs * compareScale)) }, selected && (compareSurface ? styles.compareNavSelected : styles.navSelected), pressed && styles.pressed]}>
                <Text style={[styles.navText, compareSurface && styles.compareNavText, compareSurface && { fontSize: Math.max(12, Math.round(12 * compareScale)) }, selected && styles.navTextSelected, compareSurface && selected && styles.compareNavTextSelected]}>{item.label}</Text>
              </LinkPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function PageHeading({ title, description, compact = false, tone = 'orange' }: { title: string; description?: string; compact?: boolean; tone?: 'orange' | 'lime' | 'blue' }) {
  const { width } = useWindowDimensions();

  return (
    <>
      <BackLink label="Back" />
      <View style={[styles.masthead, width < 720 && styles.mastheadNarrow, compact && styles.mastheadCompact]}>
        <Image source={CHICKENOMICAL_ICON} accessibilityLabel="Chickenomical logo" style={[styles.brandMark, compact && styles.brandMarkCompact]} />
        <View style={styles.headingCopy}>
          <HeadingText level={1} style={[styles.pageTitle, tone === 'orange' && styles.pageTitleOrange, tone === 'lime' && styles.pageTitleLime, tone === 'blue' && styles.pageTitleBlue, width < 600 && styles.pageTitleNarrow, compact && styles.pageTitleCompact]}>{title}</HeadingText>
          {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
        </View>
      </View>
    </>
  );
}

export function BackLink({ label = 'Back', fallback = '/', tone = 'default' }: { label?: string; fallback?: string; tone?: 'default' | 'orange' }) {
  const router = useRouter();

  if (Platform.OS === 'web') return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallback as never);
        }
      }}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}>
      <Text style={[styles.backLinkText, tone === 'orange' && styles.backLinkTextOrange]}>‹ {label}</Text>
    </Pressable>
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
  scroll: { flex: 1, backgroundColor: colors.cream },
  compareScroll: { backgroundColor: colors.orange },
  scrollContent: { flexGrow: 1, paddingTop: spacing.xl, alignItems: 'center', backgroundColor: colors.cream },
  edgeToEdgeScrollContent: { paddingTop: 0 },
  compareScrollContent: { paddingHorizontal: 0, paddingTop: 0, backgroundColor: colors.cream },
  main: { width: '100%', maxWidth: 1360, flexGrow: 1, gap: spacing.xl },
  mainCompact: { gap: spacing.md },
  compareMain: { gap: 0 },
  edgeToEdgeMain: { gap: 0 },
  edgeTopInset: { backgroundColor: colors.orange },
  dataNotice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  dataNoticeLabel: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  dataNoticeText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  masthead: { flexDirection: 'row', gap: 18, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.black, paddingBottom: 28 },
  mastheadNarrow: { flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.lg },
  mastheadCompact: { gap: spacing.sm, paddingBottom: spacing.sm, rowGap: spacing.sm },
  brandMark: { width: 52, height: 52 },
  brandMarkCompact: { width: 36, height: 36 },
  headingCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  pageTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 40, lineHeight: 43, letterSpacing: -1.5 },
  pageTitleOrange: { color: colors.orangeInk },
  pageTitleLime: { color: colors.titleLime },
  pageTitleBlue: { color: colors.titleBlue },
  pageTitleNarrow: { fontSize: 27, lineHeight: 30, letterSpacing: -0.9 },
  pageTitleCompact: { fontSize: 21, lineHeight: 25, letterSpacing: -0.55 },
  pageDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, maxWidth: 760 },
  navWrap: { width: '100%', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.cream },
  compareNavWrap: { backgroundColor: colors.orange },
  nav: { width: '100%', maxWidth: 1360, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  brandLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  brandLogo: { width: 34, height: 34 },
  brandName: { color: colors.black, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, letterSpacing: -0.35 },
  compareBrandLink: { backgroundColor: colors.orange },
  navLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  navButton: { minHeight: 48, minWidth: 72, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: spacing.xs },
  navButtonNarrow: { minHeight: 48, minWidth: 66 },
  navSelected: { borderBottomColor: colors.black },
  navText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  navTextSelected: { color: colors.black, fontFamily: fonts.bold },
  compareNavButton: { borderBottomColor: 'transparent' },
  compareNavSelected: { borderBottomColor: colors.white },
  compareNavText: { color: colors.white },
  compareNavTextSelected: { color: colors.white, fontFamily: fonts.bold },
  pressed: { opacity: 0.65 },
  backLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  backLinkText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  backLinkTextOrange: { color: colors.black, fontSize: 13, lineHeight: 18 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.black },
  sectionTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, flexShrink: 1, letterSpacing: -0.5 },
  sectionTrailing: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.35, textTransform: 'uppercase' },
  rule: { height: 1, backgroundColor: colors.rule, width: '100%' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  compareFooterGap: { height: spacing.sm },
  compareFooter: { marginTop: 'auto', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.footerInk },
  footerText: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  compareFooterText: { color: colors.white, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  noticeBand: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md },
  neutralBand: { backgroundColor: colors.white },
  warningBand: { backgroundColor: colors.paleWarning, borderColor: colors.warning },
  errorBand: { backgroundColor: colors.paleDanger, borderColor: colors.danger },
  noticeTitle: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  noticeText: { color: colors.black, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
