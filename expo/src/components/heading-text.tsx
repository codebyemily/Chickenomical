import { Text, type TextProps } from 'react-native';

export type HeadingTextProps = TextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 };

export function HeadingText({ level: _level, ...props }: HeadingTextProps) {
  return <Text {...props} accessibilityRole="header" />;
}
