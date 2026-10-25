import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type ReturnKeyTypeOptions, type TextInputProps } from 'react-native';

import { colors, fonts, radii } from '@/theme';

export type FormFieldProps = {
  label: string;
  labelHidden?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  submitLabel?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  help?: string;
  error?: string;
  appearance?: 'default' | 'search';
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  blurOnSubmit?: boolean;
};

export function FormField({
  label,
  labelHidden = false,
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
  inputRef,
  autoComplete,
  textContentType,
  blurOnSubmit,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      {!labelHidden ? <Text style={[styles.label, appearance === 'search' && styles.searchLabel]}>{label}</Text> : null}
      <View style={[
        styles.inputHost,
        appearance === 'search' && (focused ? styles.searchInputHostFocused : styles.searchInputHost),
      ]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error ?? help}
          value={value}
          autoComplete={autoComplete}
          textContentType={textContentType}
          blurOnSubmit={blurOnSubmit}
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
  label: { color: colors.black, fontFamily: fonts.monoBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  searchLabel: { color: colors.black, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  inputHost: { width: '100%', borderRadius: radii.md },
  // The search field is already framed by its parent pill. A second rule here
  // makes the control look like an input inside an input, especially on focus.
  searchInputHost: { borderBottomWidth: 0 },
  searchInputHostFocused: { borderBottomWidth: 0 },
  input: {
    width: '100%',
    height: 48,
    paddingHorizontal: 13,
    borderColor: colors.black,
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  inputFocused: { borderWidth: 2, paddingHorizontal: 12 },
  searchInput: {
    height: 48,
    paddingHorizontal: 0,
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  help: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
});
