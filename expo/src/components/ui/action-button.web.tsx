import { Button, Host } from '@expo/ui';
import type { UniversalStyle } from '@expo/ui';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fonts, radii } from '@/theme';

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
  const minimumWidth = width ?? (label ? Math.max(100, Math.ceil(label.length * 8.5 + 32)) : 160);
  const primary = kind === 'primary';

  return (
    <Host matchContents seedColor={colors.black} colorScheme="light" style={{ maxWidth: '100%', minWidth: minimumWidth }}>
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant="text"
        testID={testID}
        style={{
          width,
          height: 48,
          paddingHorizontal: 14,
          borderRadius: radii.pill,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: primary ? colors.yellow : colors.black,
          backgroundColor: kind === 'text' ? 'transparent' : primary ? colors.yellow : colors.white,
          opacity: disabled ? 0.5 : 1,
        }}>
        {label ? (
          <Text accessibilityLabel={selected === undefined ? undefined : `${label}, ${selected ? 'selected' : 'not selected'}`} style={styles.label}>
            {label}
          </Text>
        ) : children}
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.black, fontFamily: fonts.medium, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
