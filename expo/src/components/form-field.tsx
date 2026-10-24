import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type ReturnKeyTypeOptions } from 'react-native';

import { colors, fonts, radii } from '@/theme';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  submitLabel?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  help?: string;
  appearance?: 'default' | 'search';
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  submitLabel = 'done',
  onSubmitEditing,
  help,
  appearance = 'default',
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {appearance !== 'search' ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        returnKeyType={submitLabel}
        autoCapitalize={appearance === 'search' ? 'none' : 'sentences'}
        autoCorrect={appearance !== 'search'}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, appearance === 'search' && styles.searchInput, focused && styles.inputFocused]}
      />
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7, flex: 1, minWidth: 0 },
  label: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderColor: colors.black,
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  inputFocused: { borderWidth: 2 },
  searchInput: { borderWidth: 0, borderBottomWidth: 2, borderRadius: 0, backgroundColor: 'transparent', paddingHorizontal: 0, fontSize: 16 },
  help: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
});
