import { createContext, useContext, type ReactNode } from 'react';
export type NativeExampleStyle =
  'vega' | 'nova' | 'maia' | 'lyra' | 'mira' | 'luma' | 'sera' | 'rhea';
const ExampleStyle = createContext<NativeExampleStyle>('nova');
export const useNativeExampleStyle = () => useContext(ExampleStyle);
/** Recipe-local style selection; each native component slot is reviewed separately. */
export function NativeExampleOptions({
  style,
  children,
}: {
  style: NativeExampleStyle;
  children?: ReactNode;
}) {
  return (
    <ComponentPreset.Provider value={style}>
      <ExampleStyle.Provider value={style}>{children}</ExampleStyle.Provider>
    </ComponentPreset.Provider>
  );
}

export const NativeRecipeState = createContext<{
  selected?: boolean;
  checked?: boolean | 'mixed';
  expanded?: boolean;
  disabled?: boolean;
}>({});
export const useNativeRecipeState = () => useContext(NativeRecipeState);

const RegistryPalette = createContext<'legacy' | 'modern'>('modern');
export const useRegistryPalette = () => useContext(RegistryPalette);
export function NativeRegistryPalette({
  generation,
  children,
}: {
  generation: 'legacy' | 'modern';
  children?: ReactNode;
}) {
  return <RegistryPalette.Provider value={generation}>{children}</RegistryPalette.Provider>;
}

const ComponentPreset = createContext<NativeExampleStyle | undefined>(undefined);
export const useNativeComponentStyle = () => useContext(ComponentPreset);
/** Explicit component preset selection. Only reviewed native slots consume it. */
export function NativeComponentStyleProvider({
  style,
  children,
}: {
  style: NativeExampleStyle;
  children?: ReactNode;
}) {
  return (
    <ComponentPreset.Provider value={style}>
      <ExampleStyle.Provider value={style}>{children}</ExampleStyle.Provider>
    </ComponentPreset.Provider>
  );
}
export const NativeButtonGroupContext = createContext(false);
export const NativeButtonIconSize = createContext<number | undefined>(undefined);
