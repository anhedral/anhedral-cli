import { TextInput, type TextInputProps } from 'react-native';
import type { Ref } from 'react';
import { useTheme } from '../theme';
import { useNativeFontStyle } from './fonts';
export type InputProps = TextInputProps & { invalid?: boolean; ref?: Ref<TextInput> };
export function Input({ style, invalid, ...props }: InputProps) {
  const { colors, radius } = useTheme();
  const font = useNativeFontStyle();
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors['muted-foreground']}
      selectionColor={colors.primary}
      style={[
        {
          minHeight: 44,
          borderWidth: 1,
          borderColor: invalid ? colors.destructive : colors.input,
          backgroundColor: colors.background,
          color: colors.foreground,
          borderRadius: radius,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
        },
        font,
        style,
      ]}
    />
  );
}
