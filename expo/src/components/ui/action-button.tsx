import { Button, Host } from '@expo/ui';
import type { UniversalStyle } from '@expo/ui';
import type { PropsWithChildren } from 'react';

import { getActionButtonPresentation } from './action-button-presentation';

import { colors } from '@/theme';

type Props = PropsWithChildren<{
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  selected?: boolean;
  width?: UniversalStyle['width'];
  testID?: string;
}>;

export function ActionButton({ children, onPress, kind = 'secondary', disabled, selected, width, testID }: Props) {
  const label = typeof children === 'string' ? children : undefined;
  const presentation = getActionButtonPresentation({ kind, disabled, selected, width, label });
  return (
    <Host matchContents seedColor={colors.black} colorScheme="light" style={{ maxWidth: '100%' }}>
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant="text"
        testID={testID}
        style={presentation.style}
        modifiers={presentation.modifiers}
      />
    </Host>
  );
}
