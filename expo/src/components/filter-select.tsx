import { Host, Picker } from '@expo/ui';
import type { ComponentProps } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  hostStyle?: ComponentProps<typeof Host>['style'];
};

export function FilterSelect({ label, value, onChange, options, containerStyle, labelStyle, hostStyle }: FilterSelectProps) {
  return (
    <View style={containerStyle} accessibilityLabel={label}>
      <Text style={labelStyle}>{label}</Text>
      <Host matchContents={{ vertical: true }} seedColor={colors.black} colorScheme="light" style={hostStyle}>
        <Picker testID={label.toLowerCase() + '-filter'} selectedValue={value} onValueChange={onChange}>
          {options.map((option) => <Picker.Item key={option.value} value={option.value} label={option.label} />)}
        </Picker>
      </Host>
    </View>
  );
}
