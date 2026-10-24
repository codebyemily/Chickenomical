import type { UniversalBaseProps } from '@expo/ui';
import { defaultMinSize, semantics } from '@expo/ui/jetpack-compose/modifiers';

import type { ActionButtonPresentationOptions } from './action-button-presentation';

import { colors, radii } from '@/theme';

export function getActionButtonPresentation({ kind, disabled, selected, width, label }: ActionButtonPresentationOptions): Pick<UniversalBaseProps, 'style' | 'modifiers'> {
  const primary = kind === 'primary';

  return {
    style: {
      width,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      borderWidth: kind === 'secondary' ? 1 : 0,
      borderColor: primary ? colors.yellow : colors.black,
      backgroundColor: kind === 'text' ? 'transparent' : primary ? colors.yellow : colors.white,
      opacity: disabled ? 0.5 : 1,
    },
    modifiers: [
      defaultMinSize({ minWidth: width == null ? 100 : undefined, minHeight: 48 }),
      // SDK 58 semantics exposes a spoken description, but no selected-state setter.
      ...(selected !== undefined && label ? [semantics({ contentDescription: `${label}, ${selected ? 'selected' : 'not selected'}` })] : []),
    ],
  };
}
