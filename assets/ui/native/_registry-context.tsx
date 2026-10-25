import { createContext, useContext, type ReactNode } from 'react';
export type NativeExampleStyle =
  'vega' | 'nova' | 'maia' | 'lyra' | 'mira' | 'luma' | 'sera' | 'rhea';
const ExampleStyle = createContext<NativeExampleStyle>('nova');
export const useNativeExampleStyle = () => useContext(ExampleStyle);
/** Recipe-local style conditions; this does not certify all component preset implementations. */
export function NativeExampleOptions({
  style,
  children,
}: {
  style: NativeExampleStyle;
  children?: ReactNode;
}) {
  return <ExampleStyle.Provider value={style}>{children}</ExampleStyle.Provider>;
}

export const NativeRecipeState = createContext<{
  selected?: boolean;
  checked?: boolean | 'mixed';
  expanded?: boolean;
  disabled?: boolean;
}>({});
export const useNativeRecipeState = () => useContext(NativeRecipeState);
