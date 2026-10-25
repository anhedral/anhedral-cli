import { useEffect, useRef, useState } from 'react';
import { setStringAsync } from 'expo-clipboard';
/** Companion hook is outside the published registry index but is a reviewed example dependency. */
export const nativeClipboardSource = {
  repository: 'https://github.com/shadcn-ui/ui',
  commit: '617134d5810bba521803b3ed787190bacbb80b35',
  origin: 'apps/v4/hooks/use-copy-to-clipboard.ts',
  sha256: 'd518ba358b8f1b5de78c403f92b57d4e0e7bb6058a4f06edb00c3b5df29e2851',
} as const;
/** Native OS clipboard replaces navigator.clipboard and the hidden browser textarea fallback. */
export function useCopyToClipboard({
  timeout = 2000,
  onCopy,
}: { timeout?: number; onCopy?: () => void } = {}) {
  const [isCopied, setIsCopied] = useState(false);
  const mounted = useRef(true),
    request = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      clearTimeout(timer.current);
    };
  }, []);
  async function copyToClipboard(value: string) {
    if (!value) return false;
    const current = ++request.current;
    try {
      if (!(await setStringAsync(value))) return false;
    } catch {
      return false;
    }
    if (mounted.current && current === request.current) {
      clearTimeout(timer.current);
      setIsCopied(true);
      if (timeout !== 0)
        timer.current = setTimeout(() => {
          if (mounted.current) setIsCopied(false);
        }, timeout);
    }
    onCopy?.();
    return true;
  }
  return { isCopied, copyToClipboard };
}
