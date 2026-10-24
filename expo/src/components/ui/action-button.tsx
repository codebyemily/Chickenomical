import { Button, Host } from '@expo/ui';
import type { UniversalStyle } from '@expo/ui';
import type { PropsWithChildren } from 'react';

import { colors, radii } from '@/theme';

type Props = PropsWithChildren<{
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  width?: UniversalStyle['width'];
  testID?: string;
}>;

export function ActionButton({ children, onPress, kind = 'secondary', disabled, width, testID }: Props) {
  const primary = kind === 'primary';
  const label = typeof children === 'string' ? children : undefined;
  const buttonWidth = width ?? (label ? Math.max(100, Math.ceil(label.length * 8.5 + 32)) : 160);
  return (
    <Host matchContents seedColor={colors.black} colorScheme="light">
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant="text"
        testID={testID}
        style={{
          width: buttonWidth,
          height: 46,
          paddingHorizontal: 14,
          borderRadius: radii.pill,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: primary ? colors.yellow : colors.black,
          backgroundColor: kind === 'text' ? 'transparent' : primary ? colors.yellow : colors.white,
          opacity: disabled ? 0.5 : 1,
        }}>
      </Button>
    </Host>
  );
}
