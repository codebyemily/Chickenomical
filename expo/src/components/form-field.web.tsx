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
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  onSubmitEditing,
  help,
}: FormFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmitEditing?.();
  }

  return (
    <TextField
      fullWidth
      value={value}
      onChange={onChangeText}
      style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 7, minWidth: 220 }}>
      <Label style={{ color: colors.black, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.3 }}>
        {label}
      </Label>
      <Input
        placeholder={placeholder}
        inputMode={keyboardType === 'numeric' ? 'numeric' : keyboardType === 'decimal-pad' ? 'decimal' : 'text'}
        onKeyDown={handleKeyDown}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          minHeight: 48,
          paddingInline: 13,
          border: `1px solid ${colors.black}`,
          borderRadius: radii.md,
          backgroundColor: colors.white,
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
