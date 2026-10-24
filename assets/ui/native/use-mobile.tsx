import { useWindowDimensions } from 'react-native';
/** Uses the actual native window, including rotation and split-screen updates. */
export function useIsMobile(breakpoint = 768): boolean {
  const { width } = useWindowDimensions();
  return width < breakpoint;
}
