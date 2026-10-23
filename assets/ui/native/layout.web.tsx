import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export function Stack({ children }: ViewProps) { return <div className="flex flex-col gap-3">{children}</div>; }
export function Screen({ children }: { children: ReactNode }) { return <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-10 sm:px-6">{children}</main>; }
