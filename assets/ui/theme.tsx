import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { styling } from '@workspace/styling';
type ThemeColors = Record<string, string> & { background: string; foreground: string };
const colors = (tokens: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(tokens)
      .filter(([key]) => key !== '--radius')
      .map(([key, value]) => [key.slice(2), 'hsl(' + value.replaceAll(' ', ', ') + ')']),
  ) as ThemeColors;
const themes = { light: colors(styling.themes.light), dark: colors(styling.themes.dark) };
import { readPreference, savePreference, applyTheme, subscribePreference } from './theme-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
const ThemeContext = createContext<{
  preference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof themes.light;
  setPreference: (value: ThemePreference) => void;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
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
    if (ready) applyTheme(mode, themes[mode].background, preference);
  }, [mode, ready, preference]);
  function setPreference(value: ThemePreference) {
    if (!isThemePreference(value)) return;
    changed.current = true;
    setPreferenceState(value);
    void savePreference(value);
  }
  return (
    <ThemeContext.Provider value={{ preference, mode, colors: themes[mode], setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('Mount ThemeProvider at the application root.');
  return value;
}
