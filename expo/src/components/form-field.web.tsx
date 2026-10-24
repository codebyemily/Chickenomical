import { Description } from '@heroui/react/description';
import { Input } from '@heroui/react/input';
import { Label } from '@heroui/react/label';
import { TextField } from '@heroui/react/textfield';
import type { KeyboardEvent } from 'react';

import { colors, fonts, radii } from '@/theme';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  submitLabel?: 'done' | 'search' | 'go' | 'next' | 'send';
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
  onSubmitEditing,
  help,
  appearance = 'default',
}: FormFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmitEditing?.();
  }

  return (
    <TextField
      aria-label={appearance === 'search' ? label : undefined}
      fullWidth
      value={value}
      onChange={onChangeText}
      style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 7, minWidth: 0 }}>
      {appearance !== 'search' ? <Label style={{ color: colors.black, fontFamily: fonts.monoBold, fontSize: 11, lineHeight: '16px', letterSpacing: 0.3 }}>
        {label}
      </Label> : null}
      <Input
        placeholder={placeholder}
        inputMode={keyboardType === 'numeric' ? 'numeric' : keyboardType === 'decimal-pad' ? 'decimal' : 'text'}
        onKeyDown={handleKeyDown}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          minHeight: 48,
          paddingInline: appearance === 'search' ? 0 : 13,
          border: appearance === 'search' ? 0 : `1px solid ${colors.black}`,
          borderBottom: appearance === 'search' ? `2px solid ${colors.black}` : undefined,
          borderRadius: radii.md,
          backgroundColor: appearance === 'search' ? 'transparent' : colors.white,
          color: colors.black,
          fontFamily: fonts.regular,
          fontSize: 16,
        }}
      />
      {help ? (
        <Description style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: '18px' }}>
          {help}
        </Description>
      ) : null}
    </TextField>
  );
}
