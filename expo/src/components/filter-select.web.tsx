import { Host, Picker } from '@expo/ui';
import { Text, View } from 'react-native';

import type { FilterSelectProps } from '@/components/filter-select';
import { colors, spacing } from '@/theme';

export function FilterSelect({ label, value, onChange, options, containerStyle, labelStyle, hostStyle }: FilterSelectProps) {
  return (
    <View style={containerStyle}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        <Text style={labelStyle}>{label}</Text>
        <Host matchContents={{ vertical: true }} seedColor={colors.black} colorScheme="light" style={hostStyle}>
          <Picker testID={label.toLowerCase() + '-filter'} selectedValue={value} onValueChange={onChange}>
            {options.map((option) => <Picker.Item key={option.value} value={option.value} label={option.label} />)}
          </Picker>
        </Host>
      </label>
    </View>
  );
}
