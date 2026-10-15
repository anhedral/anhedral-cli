import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

/** Keep app controls outside host chrome, including the desktop fullscreen composer. */
export function hostLayout(context: McpUiHostContext | undefined) {
  const desktopFullscreen = context?.platform === 'desktop' && context.displayMode === 'fullscreen';
  const inset = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  return {
    top: Math.max(desktopFullscreen ? 112 : 0, inset(context?.safeAreaInsets?.top)),
    right: inset(context?.safeAreaInsets?.right),
    bottom: inset(context?.safeAreaInsets?.bottom),
    left: inset(context?.safeAreaInsets?.left),
  };
}

export function applyHostLayout(context: McpUiHostContext | undefined) {
  for (const [edge, value] of Object.entries(hostLayout(context)))
    document.documentElement.style.setProperty(`--host-inset-${edge}`, `${value}px`);
}
