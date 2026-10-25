import type { AccessibilityProps } from 'react-native';

/** Hide a drawn mark from both VoiceOver and TalkBack. */
export const decorative: Pick<AccessibilityProps, 'accessibilityElementsHidden' | 'importantForAccessibility'> = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
};
