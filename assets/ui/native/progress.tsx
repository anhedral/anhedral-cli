import { createContext, useContext, type ReactNode } from 'react';
import { View, ActivityIndicator, type ViewProps, type TextProps } from 'react-native';
import { Box, LabelText, plainText } from './_core';
import { useTheme } from '../theme';
const Context = createContext<{ value: number | null; max: number; percent: number | null } | null>(
  null,
);
function useProgress() {
  const value = useContext(Context);
  if (!value) throw Error('Progress parts require Progress.');
  return value;
}
export function Progress({
  value = 0,
  max = 100,
  children,
  style,
  ...props
}: ViewProps & { value?: number | null; max?: number }) {
  const maximum = Number.isFinite(max) && max > 0 ? max : 100;
  const current =
    value === null ? null : Math.min(maximum, Math.max(0, Number.isFinite(value) ? value : 0));
  const accessibility = {
    accessibilityRole: 'progressbar' as const,
    accessibilityValue:
      current === null ? { min: 0, max: maximum } : { min: 0, max: maximum, now: current },
    accessibilityState: { busy: current === null },
  };
  return (
    <Context.Provider
      value={{
        value: current,
        max: maximum,
        percent: current === null ? null : (100 * current) / maximum,
      }}
    >
      {children === undefined ? (
        <ProgressTrack accessible {...accessibility} {...props} style={style}>
          <ProgressIndicator />
        </ProgressTrack>
      ) : (
        <Box
          accessible
          {...accessibility}
          accessibilityLabel={props.accessibilityLabel ?? plainText(children)}
          {...props}
          style={style}
        >
          {children}
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Box>
      )}
    </Context.Provider>
  );
}
export function ProgressTrack({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          height: 8,
          width: '100%',
          backgroundColor: colors.secondary,
          borderRadius: 4,
          overflow: 'hidden',
        },
        style,
      ]}
    />
  );
}
export function ProgressIndicator({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  const state = useProgress();
  return state.percent === null ? (
    <ActivityIndicator accessible={false} size="small" color={colors.primary} />
  ) : (
    <View
      {...props}
      style={[
        { height: '100%', width: `${state.percent}%`, backgroundColor: colors.primary },
        style,
      ]}
    />
  );
}
export const ProgressLabel = LabelText;
export function ProgressValue({
  children,
  ...props
}: Omit<TextProps, 'children'> & {
  children?: ReactNode | ((value: number | null, percent: number | null) => ReactNode);
}) {
  const state = useProgress();
  return (
    <LabelText {...props}>
      {typeof children === 'function'
        ? children(state.value, state.percent)
        : (children ?? (state.percent === null ? 'Loading' : `${Math.round(state.percent)}%`))}
    </LabelText>
  );
}
