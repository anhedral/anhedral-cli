import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { styling } from '@workspace/styling';
import { bubbleTint } from './native/_color';
type ThemeColors = Record<string, string> & { background: string; foreground: string };
const colors = (tokens: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(tokens)
      .filter(([key]) => key !== '--radius')
      .map(([key, value]) => [key.slice(2), 'hsl(' + value.replaceAll(' ', ', ') + ')']),
  ) as ThemeColors;
const themes: Record<'light' | 'dark', ThemeColors> = {
  light: {
    ...styling.registryThemes['theme-neutral'].native.light,
    ...colors(styling.themes.light),
  },
  dark: { ...styling.registryThemes['theme-neutral'].native.dark, ...colors(styling.themes.dark) },
};
import { readPreference, savePreference, applyTheme, subscribePreference } from './theme-storage';

export type NativeRegistryTheme = keyof typeof styling.registryThemes;
export const nativeRegistryThemeNames = Object.keys(
  styling.registryThemes,
) as NativeRegistryTheme[];
export type ThemePreference = 'system' | 'light' | 'dark';
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
const ThemeContext = createContext<{
  preference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof themes.light;
  radius: number;
  bubbleTinted: string;
  setPreference: (value: ThemePreference) => void;
} | null>(null);
export function ThemeProvider({
  children,
  theme,
}: {
  children: ReactNode;
  theme?: NativeRegistryTheme;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const activeColors = useMemo(
    () =>
      theme
        ? ({ ...themes[mode], ...styling.registryThemes[theme].native[mode] } as ThemeColors)
        : themes[mode],
    [theme, mode],
  );
  const bubbleTinted = useMemo(
    () => bubbleTint(activeColors.primary ?? activeColors.foreground, mode),
    [activeColors.primary, activeColors.foreground, mode],
  );
  const radius = theme
    ? ((styling.registryThemes[theme].metrics[mode] as { radius?: number }).radius ?? 8)
    : 8;
  useEffect(() => {
    let active = true;
    void readPreference()
      .then((saved) => {
        if (active && !changed.current && isThemePreference(saved)) setPreferenceState(saved);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    const unsubscribe = subscribePreference((saved) => {
      if (isThemePreference(saved)) setPreferenceState(saved);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (ready) applyTheme(mode, activeColors.background, preference);
  }, [mode, ready, preference, activeColors.background]);
  const setPreference = useCallback((value: ThemePreference) => {
    if (!isThemePreference(value)) return;
    changed.current = true;
    setPreferenceState(value);
    void savePreference(value);
  }, []);
  const value = useMemo(
    () => ({ preference, mode, colors: activeColors, radius, bubbleTinted, setPreference }),
    [preference, mode, activeColors, radius, bubbleTinted, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('Mount ThemeProvider at the application root.');
  return value;
}
