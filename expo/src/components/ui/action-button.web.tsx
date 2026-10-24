import { Button as HeroButton } from '@heroui/react/button';
import type { PropsWithChildren } from 'react';

import { colors, fonts, radii } from '@/theme';

type Props = PropsWithChildren<{
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  selected?: boolean;
  width?: number | string;
  testID?: string;
}>;

export function ActionButton({ children, onPress, kind = 'secondary', disabled, selected, width, testID }: Props) {
  const label = typeof children === 'string' ? children : undefined;
  const buttonWidth = width ?? (label ? Math.max(100, Math.ceil(label.length * 8.5 + 32)) : 160);

  return (
    <HeroButton
      variant={kind === 'primary' ? 'primary' : kind === 'secondary' ? 'outline' : 'tertiary'}
      size="md"
      isDisabled={disabled}
      aria-pressed={selected}
      onPress={onPress}
      data-testid={testID}
      style={{
        minWidth: typeof buttonWidth === 'number' ? buttonWidth : undefined,
        width: typeof buttonWidth === 'string' ? buttonWidth : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        paddingInline: 14,
        borderRadius: radii.pill,
        borderStyle: 'solid',
        borderWidth: kind === 'secondary' ? 1 : 0,
        borderColor: kind === 'primary' ? colors.yellow : colors.black,
        backgroundColor: kind === 'text' ? 'transparent' : kind === 'primary' ? colors.yellow : colors.white,
        color: colors.black,
        fontFamily: fonts.medium,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textDecoration: 'none',
      }}>
      {children}
    </HeroButton>
  );
}
