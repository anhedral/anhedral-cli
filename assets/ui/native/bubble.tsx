import { Children, createContext, useContext } from 'react';
import type { ViewProps } from 'react-native';
import { Box, LabelText, row } from './_core';
import { useTheme } from '../theme';
const Foreground = createContext<string | undefined>(undefined);
type Variant = 'default' | 'secondary' | 'muted' | 'tinted' | 'outline' | 'ghost' | 'destructive';
export function Bubble({
  variant = 'default',
  align,
  side = 'start',
  children,
  style,
  ...props
}: ViewProps & { variant?: Variant; align?: 'start' | 'end'; side?: 'start' | 'end' }) {
  const { colors } = useTheme();
  const selected = align ?? side;
  const background =
    variant === 'default'
      ? colors.primary
      : variant === 'secondary' || variant === 'tinted'
        ? colors.secondary
        : variant === 'muted'
          ? colors.muted
          : variant === 'destructive'
            ? colors.destructive
            : 'transparent';
  const foreground =
    variant === 'default' || variant === 'destructive'
      ? colors['primary-foreground']
      : colors.foreground;
  return (
    <Foreground.Provider value={foreground}>
      <Box
        {...props}
        style={[
          {
            position: 'relative',
            alignSelf: selected === 'end' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            backgroundColor: background,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            gap: 6,
          },
          style,
        ]}
      >
        {Children.map(children, (child) =>
          typeof child === 'string' || typeof child === 'number' ? (
            <LabelText style={{ color: foreground }}>{child}</LabelText>
          ) : (
            child
          ),
        )}
      </Box>
    </Foreground.Provider>
  );
}
export function BubbleContent({ children, ...props }: ViewProps) {
  const color = useContext(Foreground);
  return (
    <Box {...props}>
      {Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <LabelText style={{ color }}>{child}</LabelText>
        ) : (
          child
        ),
      )}
    </Box>
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
