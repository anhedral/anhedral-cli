import { createContext } from 'react';
/** Physical native overlay boundaries reset DOM-style ancestor relationships. */
export const NativeKbdSurfaceContext = createContext<{ tooltip?: boolean; inputGroup?: boolean }>(
  {},
);
