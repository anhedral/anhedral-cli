import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, Pressable, type TextStyle } from 'react-native';
import catalog from '../../native-fonts.json';
export type NativeFontId = keyof typeof catalog.items;
export type NativeFontRole = 'sans' | 'serif' | 'mono' | 'heading';
export type NativeFontCut = {
  name: string;
  file: string;
  weight: number;
  sfntWeight: number;
  italic: boolean;
  sha256: string;
  bytes: number;
};
type Family = {
  family: string;
  variants: NativeFontCut[];
  license: { file: string; text: string; sha256: string };
};
const families: Record<string, Family> = catalog.families;
export const nativeFontIds = Object.keys(catalog.items) as NativeFontId[];
export function nativeFontDetails(id: NativeFontId) {
  const item = catalog.items[id];
  if (!item) throw Error('Unknown native registry font: ' + id);
  const family = families[item.family]!;
  return {
    id,
    family: family.family,
    variants: family.variants,
    license: family.license,
    role: item.upstream.variable.replace('--font-', '') as NativeFontRole,
  };
}
const alias = (cut: NativeFontCut) => 'Anhedral_' + cut.name;
export function nativeFontSources(ids: readonly NativeFontId[]) {
  const resources: Record<string, { uri: string }> = {};
  for (const id of new Set(ids)) {
    const item = catalog.items[id];
    if (!item) throw Error('Unknown native registry font: ' + id);
    for (const cut of families[item.family]!.variants)
      resources[alias(cut)] = {
        uri: `https://raw.githubusercontent.com/expo/google-fonts/${catalog.source.commit}/font-packages/${item.family}/${cut.file}`,
      };
  }
  return resources;
}
/** Static cuts have their own registered family; avoid OS synthetic weight/italic. */
export function nativeFontStyle(id: NativeFontId, weight = 400, italic = false): TextStyle {
  if (!Number.isFinite(weight) || weight < 100 || weight > 900)
    throw Error('Font weight must be between 100 and 900.');
  const variants = nativeFontDetails(id).variants;
  let choices = variants.filter((cut) => cut.italic === italic);
  const syntheticItalic = italic && !choices.length;
  if (syntheticItalic) choices = variants.filter((cut) => !cut.italic);
  const rank = (value: number) => {
    if (weight >= 400 && weight <= 500)
      return value >= weight && value <= 500
        ? value - weight
        : value < weight
          ? 1000 + weight - value
          : 2000 + value - weight;
    return weight < 400
      ? value <= weight
        ? weight - value
        : 1000 + value - weight
      : value >= weight
        ? value - weight
        : 1000 + weight - value;
  };
  const ordered = [...choices].sort((a, b) => rank(a.weight) - rank(b.weight));
  return {
    fontFamily: alias(ordered[0]!),
    fontWeight: 'normal',
    fontStyle: syntheticItalic ? 'italic' : 'normal',
  };
}
export function useNativeFonts(ids: readonly NativeFontId[]) {
  const key = [...new Set(ids)].sort().join(','),
    [attempt, setAttempt] = useState(0),
    [state, setState] = useState<{ key: string; loaded: boolean; error: Error | null }>({
      key: '',
      loaded: false,
      error: null,
    });
  useEffect(() => {
    let active = true;
    setState({ key, loaded: !key, error: null });
    if (key)
      void import('expo-font')
        .then(async (font) => {
          const sources = nativeFontSources(key.split(',') as NativeFontId[]);
          const pending = Object.fromEntries(
            Object.entries(sources).filter(([name]) => !font.isLoaded(name)),
          );
          if (Object.keys(pending).length) await font.loadAsync(pending);
        })
        .then(
          () => {
            if (active) setState({ key, loaded: true, error: null });
          },
          (error) => {
            if (active)
              setState({
                key,
                loaded: false,
                error: error instanceof Error ? error : new Error(String(error)),
              });
          },
        );
    return () => {
      active = false;
    };
  }, [key, attempt]);
  return {
    loaded: state.key === key && state.loaded,
    error: state.key === key ? state.error : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
type FontMap = Partial<Record<NativeFontRole, NativeFontId>>;
const FontContext = createContext<FontMap>({});
export function NativeFontProvider({
  fonts,
  children,
  fallback = <Text>Loading fonts…</Text>,
  renderError,
}: {
  fonts: FontMap;
  children: ReactNode;
  fallback?: ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
}) {
  const ids = Object.values(fonts),
    state = useNativeFonts(ids);
  const value = useMemo(() => ({ ...fonts }), [fonts.sans, fonts.serif, fonts.mono, fonts.heading]);
  if (state.error)
    return renderError ? (
      renderError(state.error, state.retry)
    ) : (
      <>
        <Text accessibilityRole="alert">Unable to load fonts.</Text>
        <Pressable accessibilityRole="button" onPress={state.retry}>
          <Text>Retry fonts</Text>
        </Pressable>
      </>
    );
  if (!state.loaded) return fallback;
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}
export function useNativeFontStyle(
  role: NativeFontRole = 'sans',
  weight = 400,
  italic = false,
): TextStyle {
  const fonts = useContext(FontContext),
    id = fonts[role] ?? (role === 'heading' ? fonts.sans : undefined);
  return id ? nativeFontStyle(id, weight, italic) : {};
}
