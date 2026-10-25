import { useState, type ReactElement } from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppFrame } from '@/components/app-frame';
import { HeadingText } from '@/components/heading-text';
import { LinkPressable } from '@/components/link-pressable';
import { decorative } from '@/lib/a11y';
import { pageMetadata } from '@/data/page-metadata';
import { colors, curve, fonts, radii, ripple, spacing } from '@/theme';
import type { GenerateMetadataFunction } from 'expo-router/server';

const CHICKEN = require('../../../../assets/images/chickenomical.png');

const FOODS = [
  { label: 'Wings', wash: colors.orange, Mark: WingsMark },
  { label: 'Tenders', wash: colors.lime, Mark: TendersMark },
  { label: 'Nuggets', wash: colors.yellow, Mark: NuggetsMark },
  { label: 'Buckets', wash: colors.sky, Mark: BucketsMark },
] as const;

export const generateMetadata: GenerateMetadataFunction = () => pageMetadata(
  'Choose your chicken',
  'Start with wings, tenders, nuggets, or buckets.',
);

export default function LandingScreen() {
  const { width, height } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const columns = width < 340 ? 1 : width >= 1120 ? 4 : 2;
  const pad = clamp(Math.round(width * 0.035), spacing.lg, 56);
  const gridGap = clamp(Math.round(width * 0.014), spacing.md, spacing.xl);
  const cardWidth = (width - pad * 2 - gridGap * (columns - 1)) / columns;
  const scale = clamp(cardWidth / (native ? 260 : 292), native ? 0.95 : 0.85, 1.4);
  const cardHeight = columns === 2
    ? clamp(Math.round(Math.max(cardWidth * (native ? 0.44 : 0.4), height * (native ? 0.2 : 0.18))), native ? 140 : 120, native ? 240 : 220)
    : clamp(Math.round(Math.max(cardWidth * (native ? 0.44 : 0.42), height * (native ? 0.15 : 0.14))), native ? 140 : 120, native ? 240 : 220);
  const scaled = (value: number) => Math.round(value * scale);

  return (
    <AppFrame active="Compare" compact edgeToEdgeTop surface="compare">
      <View
        style={[
          styles.hero,
          {
            paddingTop: scaled(spacing.lg),
            paddingHorizontal: scaled(spacing.xl),
            paddingBottom: scaled(spacing.lg),
            gap: scaled(spacing.xs),
          },
        ]}>
        <Image {...decorative} source={CHICKEN} style={{ width: scaled(84), height: scaled(84) }} />
        <Text style={[styles.brand, { fontSize: scaled(22), lineHeight: scaled(28) }]}>Chickenomical</Text>
        <Text style={[styles.tagline, { fontSize: scaled(16), lineHeight: scaled(22) }]}>The most chicken for your money, nearby.</Text>
      </View>

      <View style={[styles.body, { paddingHorizontal: pad, paddingTop: scaled(spacing.lg), gap: scaled(spacing.md) }]}>
        <HeadingText level={1} style={[styles.heading, { fontSize: scaled(28), lineHeight: scaled(36), letterSpacing: -0.2 * scale }]}>What are you in the mood for?</HeadingText>
        <View style={[styles.grid, { gap: gridGap }]} accessibilityRole="list">
          {FOODS.map(({ label, wash, Mark }) => (
            <FoodCard
              key={label}
              label={label}
              wash={wash}
              Mark={Mark}
              width={cardWidth}
              height={cardHeight}
              scale={scale}
            />
          ))}
        </View>

        <LinkPressable
          href={'/search?browse=all' as never}
          accessibilityLabel="idk yet. Compare all chicken nearby."
          style={({ pressed }) => [styles.unsure, { paddingHorizontal: scaled(spacing.lg) }, pressed && styles.pressed]}>
          <Text style={[styles.unsureText, { fontSize: clamp(scaled(16), 15, 20), lineHeight: clamp(scaled(22), 20, 28) }]}>idk yet</Text>
        </LinkPressable>

        {Platform.OS !== 'web' ? (
          <View style={styles.pageEntries} accessibilityRole="list">
            <Text style={styles.pageEntriesLabel}>Explore</Text>
            <View style={styles.pageEntriesLinks}>
              <LinkPressable href="/quantity" style={({ pressed }) => [styles.pageEntry, pressed && styles.pressed]}>
                <Text style={styles.pageEntryText}>Group</Text>
              </LinkPressable>
              <LinkPressable href="/sources" style={({ pressed }) => [styles.pageEntry, pressed && styles.pressed]}>
                <Text style={styles.pageEntryText}>Sources</Text>
              </LinkPressable>
              <LinkPressable href="/methodology" style={({ pressed }) => [styles.pageEntry, pressed && styles.pressed]}>
                <Text style={styles.pageEntryText}>Method</Text>
              </LinkPressable>
            </View>
          </View>
        ) : null}

      </View>
    </AppFrame>
  );
}

function FoodCard({
  label,
  wash,
  Mark,
  width,
  height,
  scale,
}: {
  label: string;
  wash: string;
  Mark: () => ReactElement;
  width: number;
  height: number;
  scale: number;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <LinkPressable
      href={`/search?mood=${label}` as never}
      accessibilityLabel={`${label}. Compare nearby ${label.toLocaleLowerCase()}.`}
      accessibilityRole="button"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          minHeight: height,
          backgroundColor: wash,
          gap: Math.round(spacing.sm * scale),
          paddingHorizontal: Math.round(spacing.md * scale),
          paddingVertical: Math.round(spacing.md * scale),
          borderRadius: clamp(Math.round(radii.lg * scale), radii.md, 32),
        },
        hovered && styles.cardHovered,
        focused && styles.cardFocused,
        pressed && styles.cardPressed,
      ]}>
      <View {...decorative} style={[styles.markSlot, { height: Math.round(52 * scale) }]}>
        <View style={{ transform: [{ scale }] }}>
          <Mark />
        </View>
      </View>
      <Text style={[styles.cardLabel, { fontSize: Math.round(22 * scale), lineHeight: Math.round(28 * scale) }]}>{label}</Text>
    </LinkPressable>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function WingsMark() {
  return (
    <View style={styles.markRow}>
      <View style={styles.wing}>
        <View style={styles.bone} />
      </View>
      <View style={[styles.wing, styles.wingTurn]}>
        <View style={styles.bone} />
      </View>
    </View>
  );
}

function TendersMark() {
  return (
    <View style={styles.markRow}>
      <View style={[styles.tender, styles.tenderShort]} />
      <View style={styles.tender} />
      <View style={[styles.tender, styles.tenderMid]} />
    </View>
  );
}

function NuggetsMark() {
  return (
    <View style={styles.nuggetCluster}>
      <View style={styles.nugget} />
      <View style={[styles.nugget, styles.nuggetWide]} />
      <View style={styles.nugget} />
      <View style={[styles.nugget, styles.nuggetSmall]} />
    </View>
  );
}

function BucketsMark() {
  return (
    <View style={styles.bucket}>
      <View style={styles.bucketRim} />
      <View style={styles.bucketBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    gap: spacing.xs,
  },
  chicken: { width: 84, height: 84 },
  brand: {
    color: colors.black,
    fontFamily: fonts.bold,
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  tagline: {
    maxWidth: 320,
    color: colors.black,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  body: { width: '100%', paddingTop: spacing.lg, gap: spacing.md },
  heading: {
    color: colors.black,
    fontFamily: fonts.bold,
    fontStyle: 'italic',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: curve,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardHovered: { borderColor: colors.black },
  cardFocused: { borderColor: colors.purple },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  markSlot: { height: 52, alignItems: 'center', justifyContent: 'center' },
  cardLabel: {
    color: colors.black,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  unsure: {
    alignSelf: 'center',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  unsureText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  pageEntries: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  pageEntriesLabel: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  pageEntriesLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  pageEntry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  pageEntryText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, textDecorationLine: 'underline' },
  pressed: { opacity: 0.72 },
  markRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  wing: { width: 28, height: 18, borderRadius: 12, backgroundColor: colors.orangeInk, transform: [{ rotate: '-18deg' }] },
  wingTurn: { backgroundColor: colors.bestInk, transform: [{ rotate: '16deg' }] },
  bone: { position: 'absolute', left: -6, top: 5, width: 10, height: 8, borderRadius: 5, backgroundColor: colors.white },
  tender: { width: 12, height: 40, borderRadius: 8, backgroundColor: colors.limeInk },
  tenderShort: { height: 30, backgroundColor: colors.statusOlive },
  tenderMid: { height: 36, backgroundColor: colors.titleLime },
  nuggetCluster: { width: 54, height: 44, position: 'relative' },
  nugget: { position: 'absolute', width: 18, height: 16, borderRadius: 8, backgroundColor: colors.bestInk, left: 0, top: 4 },
  nuggetWide: { left: 16, top: 0, width: 22, backgroundColor: colors.orangeInk },
  nuggetSmall: { left: 30, top: 20, width: 16, height: 14, backgroundColor: colors.warning },
  bucket: { width: 40, alignItems: 'center' },
  bucketRim: { width: 40, height: 8, borderRadius: 4, backgroundColor: colors.black },
  bucketBody: {
    width: 32,
    height: 28,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.orangeInk,
  },
});
