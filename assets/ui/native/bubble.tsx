import { Children, createContext, useContext } from 'react';
import type { ViewProps } from 'react-native';
import { Box, LabelText, row, TextToneProvider, withAlpha } from './_core';
import { useTheme } from '../theme';
type Variant = 'default' | 'secondary' | 'muted' | 'tinted' | 'outline' | 'ghost' | 'destructive';
const BubbleState = createContext<{ variant: Variant; align: 'start' | 'end' }>({
  variant: 'default',
  align: 'start',
});
export function Bubble({
  variant = 'default',
  align,
  side = 'start',
  children,
  style,
  ...props
}: ViewProps & { variant?: Variant; align?: 'start' | 'end'; side?: 'start' | 'end' }) {
  const selected = align ?? side;
  const direct = Children.toArray(children).some(
    (child) => typeof child === 'string' || typeof child === 'number',
  );
  return (
    <BubbleState.Provider value={{ variant, align: selected }}>
      <Box
        {...props}
        style={[
          {
            position: 'relative',
            alignSelf: selected === 'end' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            gap: 4,
          },
          style,
        ]}
      >
        {direct ? <BubbleContent>{children}</BubbleContent> : children}
      </Box>
    </BubbleState.Provider>
  );
}
export function BubbleContent({ children, style, ...props }: ViewProps) {
  const { variant, align } = useContext(BubbleState),
    { colors, radius, mode, bubbleTinted } = useTheme();
  const background =
    variant === 'default'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'muted'
          ? colors.muted
          : variant === 'tinted'
            ? bubbleTinted
            : variant === 'outline'
              ? colors.background
              : variant === 'destructive'
                ? withAlpha(colors.destructive ?? colors.foreground, mode === 'dark' ? 0.2 : 0.1)
                : 'transparent';
  const foreground =
    variant === 'default'
      ? colors['primary-foreground']
      : variant === 'secondary'
        ? colors['secondary-foreground']
        : variant === 'destructive'
          ? colors.destructive
          : colors.foreground;
  return (
    <TextToneProvider value={foreground}>
      <Box
        {...props}
        style={[
          {
            alignSelf: align === 'end' ? 'flex-end' : 'flex-start',
            minWidth: 0,
            backgroundColor: background,
            borderWidth: variant === 'ghost' ? 0 : 1,
            borderColor: variant === 'outline' ? colors.border : 'transparent',
            borderRadius: variant === 'ghost' ? 0 : radius + 4,
            paddingHorizontal: variant === 'ghost' ? 0 : 12,
            paddingVertical: variant === 'ghost' ? 0 : 8,
            gap: 4,
          },
          style,
        ]}
      >
        {Children.map(children, (child) =>
          typeof child === 'string' || typeof child === 'number' ? (
            <LabelText>{child}</LabelText>
          ) : (
            child
          ),
        )}
      </Box>
    </TextToneProvider>
  );
}
export const BubbleGroup = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={[{ gap: 4 }, style]} />
);
export const BubbleActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const BubbleHeader = Box;
export const BubbleFooter = Box;
export function BubbleReactions({
  side = 'bottom',
  align = 'end',
  style,
  ...props
}: ViewProps & { side?: 'top' | 'bottom'; align?: 'start' | 'end' }) {
  return (
    <Box
      {...props}
      style={[
        {
          position: 'absolute',
          flexDirection: 'row',
          gap: 4,
          ...(side === 'top' ? { top: -12 } : { bottom: -12 }),
          ...(align === 'start' ? { start: 0 } : { end: 0 }),
        },
        style,
      ]}
    />
  );
}
