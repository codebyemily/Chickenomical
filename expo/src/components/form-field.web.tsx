import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { FormFieldProps } from './form-field';
import { colors, fonts, radii } from '@/theme';

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  submitLabel = 'done',
  onSubmitEditing,
  onBlur,
  help,
  error,
  appearance = 'default',
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, appearance === 'search' && styles.searchLabel]}>{label}</Text>
      <View style={[
        styles.inputHost,
        appearance === 'search' && (focused ? styles.searchInputHostFocused : styles.searchInputHost),
      ]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? help}
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
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={[
            styles.input,
            focused && styles.inputFocused,
            appearance === 'search' && styles.searchInput,
          ]}
        />
      </View>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      {help && !error ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7, flex: 1, minWidth: 0 },
  label: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
  searchLabel: { color: colors.muted, fontSize: 10, letterSpacing: 0.7 },
  inputHost: { width: '100%', borderRadius: radii.md },
  searchInputHost: { borderBottomWidth: 2, borderBottomColor: colors.black },
  searchInputHostFocused: { borderBottomWidth: 3, borderBottomColor: colors.black },
  input: { width: '100%', height: 48, paddingHorizontal: 13, borderColor: colors.black, borderWidth: 1, borderRadius: radii.md, backgroundColor: colors.white, color: colors.black, fontFamily: fonts.regular, fontSize: 16, outlineWidth: 0 },
  inputFocused: { borderWidth: 2, paddingHorizontal: 12 },
  searchInput: { height: 48, paddingHorizontal: 0, borderWidth: 0, borderColor: 'transparent', borderRadius: 0, backgroundColor: 'transparent' },
  help: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
});
