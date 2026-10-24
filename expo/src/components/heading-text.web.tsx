import { Text } from 'react-native';

import type { HeadingTextProps } from '@/components/heading-text';

export function HeadingText({ level = 2, ...props }: HeadingTextProps) {
  return <Text {...props} accessibilityRole="header" {...{ 'aria-level': level }} />;
}
