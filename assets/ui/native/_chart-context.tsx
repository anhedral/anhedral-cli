import { createContext, type ReactNode, type ComponentType } from 'react';
export type ChartConfig = Record<
  string,
  { label?: ReactNode; icon?: ComponentType<{ size?: number; color?: string }> } & (
    { color?: string; theme?: never } | { color?: never; theme: Record<'light' | 'dark', string> }
  )
>;
export type ChartPayload = {
  name?: string | number;
  dataKey?: string | number;
  value?: number | string | readonly (number | string)[];
  color?: string;
  type?: string;
  payload?: Record<string, unknown>;
  label?: ReactNode;
};
export const ChartContext = createContext<{
  config: ChartConfig;
  width: number;
  height: number;
  resolveColor: (value: string | undefined, fallback?: string) => string;
} | null>(null);
export const ChartDataContext = createContext<{
  active: boolean;
  payload: readonly ChartPayload[];
  label?: ReactNode;
  legend: readonly ChartPayload[];
} | null>(null);
export function payloadConfig(config: ChartConfig, payload: ChartPayload | undefined, key: string) {
  if (!payload) return undefined;
  const direct = payload[key as keyof ChartPayload],
    nested = payload.payload?.[key];
  const resolved = typeof direct === 'string' ? direct : typeof nested === 'string' ? nested : key;
  return config[resolved] ?? config[key];
}
