import { createContext, useId, type ReactNode } from 'react';
/** CSS descendant metadata follows physical modal roots rather than React portal ancestry. */
export const NativePhysicalScope = createContext('root');
export const NativeOverlayContentSlot = createContext<string | undefined>(undefined);
export function NativePhysicalPortalBoundary({ children }: { children?: ReactNode }) {
  const id = useId();
  return (
    <NativePhysicalScope.Provider value={id}>
      <NativeOverlayContentSlot.Provider value={undefined}>
        {children}
      </NativeOverlayContentSlot.Provider>
    </NativePhysicalScope.Provider>
  );
}
