import {
  StyleSheet,
  type TextProps as NativeTextProps,
  type Text as NativeTextHost,
} from 'react-native';
import { LabelText as NativeText, useTextTone, NativeTextStyleContext } from './_core';
import { useContext, type Ref } from 'react';
import { useTheme } from '../theme';
export type TextProps = NativeTextProps & {
  ref?: Ref<NativeTextHost>;
  variant?: 'heading' | 'title' | 'body' | 'muted' | 'caption' | 'label';
};
const typography = StyleSheet.create({
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  muted: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
export function Text({ variant, style, ...props }: TextProps) {
  const kind = variant ?? 'body';
  const inherited = useContext(NativeTextStyleContext);
  const { colors } = useTheme();
  const tone = useTextTone();
  const color = ['muted', 'caption'].includes(kind)
    ? colors['muted-foreground']
    : (tone ?? StyleSheet.flatten(inherited.style)?.color ?? colors.foreground);
  return (
    <NativeText
      fontRole={
        variant === undefined
          ? inherited.fontRole
          : kind === 'heading' || kind === 'title'
            ? 'heading'
            : 'sans'
      }
      {...props}
      style={[
        typography[kind],
        variant === undefined ? inherited.style : undefined,
        { color },
        style,
      ]}
    />
  );
}
