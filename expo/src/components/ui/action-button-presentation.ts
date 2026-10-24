import type { UniversalBaseProps, UniversalStyle } from '@expo/ui';
import {
  accessibilityAddTraits,
  background,
  border,
  clipShape,
  contentShape,
  frame,
  opacity,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radii } from '@/theme';

export type ActionButtonPresentationOptions = {
  kind: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  selected?: boolean;
  width?: UniversalStyle['width'];
  label?: string;
};

// Native modifiers keep the minimum flexible, so Dynamic Type can make the button taller.
export function getActionButtonPresentation({ kind, disabled, selected, width }: ActionButtonPresentationOptions): Pick<UniversalBaseProps, 'style' | 'modifiers'> {
  const primary = kind === 'primary';

  return {
    style: { width, paddingHorizontal: 14, paddingVertical: 8 },
    modifiers: [
      frame({ minWidth: width == null ? 100 : undefined, minHeight: 48 }),
      background(kind === 'text' ? 'transparent' : primary ? colors.yellow : colors.white),
      border({ content: primary ? colors.yellow : colors.black, width: kind === 'secondary' ? 1 : 0 }),
      clipShape('roundedRectangle', radii.pill),
      contentShape(shapes.rectangle()),
      opacity(disabled ? 0.5 : 1),
      ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
    ],
  };
}
