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
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        returnKeyType={submitLabel}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7, flex: 1, minWidth: 220 },
  label: { color: colors.black, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.3 },
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
  help: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
});
