import type { TextStyle } from 'react-native';
/** Android RN 0.86 TextInput routes every edge color to ALL. Retain one visible edge
 * by moving invisible border widths into padding, preserving the source border box. */
export function nativeTextInputBorderStyle(style: TextStyle, platform: string): TextStyle {
  if (platform !== 'android' || style.borderColor !== 'transparent') return style;
  const edges = ['Top', 'Right', 'Bottom', 'Left'] as const;
  const resolved = edges.map((edge) => ({
    edge,
    color: style[`border${edge}Color`] ?? style.borderColor,
    width: style[`border${edge}Width`] ?? style.borderWidth ?? 0,
    padding:
      style[`padding${edge}`] ??
      style[edge === 'Top' || edge === 'Bottom' ? 'paddingVertical' : 'paddingHorizontal'] ??
      style.padding ??
      0,
  }));
  const visible = resolved.filter(({ color, width }) => color !== 'transparent' && width > 0);
  if (!visible.length) {
    const result = { ...style };
    for (const edge of edges) delete result[`border${edge}Color`];
    return result;
  }
  if (
    new Set(visible.map((edge) => edge.color)).size !== 1 ||
    resolved.some((edge) => typeof edge.padding !== 'number')
  )
    return style;
  const result: TextStyle = { ...style, borderWidth: 0, borderColor: visible[0]!.color };
  for (const { edge, color, width, padding } of resolved) {
    delete result[`border${edge}Color`];
    result[`border${edge}Width`] = color === 'transparent' ? 0 : width;
    if (color === 'transparent' && width > 0)
      result[`padding${edge}`] = (padding as number) + width;
  }
  return result;
}

/** Android clips a fixed-height EditText when CSS padding leaves less room than
 * its line-height span. Fit only source-owned vertical insets inside the same
 * border box. Explicit native caller padding continues to own its layout. */
export function nativeSingleLineInputStyle(
  style: TextStyle,
  own: TextStyle | undefined,
  platform: string,
  multiline: boolean | undefined,
  fontScale: number,
): TextStyle {
  if (platform !== 'android' || multiline) return style;
  const result = { includeFontPadding: false, ...style };
  const height = typeof style.height === 'number' ? style.height : undefined;
  const line = style.lineHeight;
  if (height === undefined || line === undefined) return result;
  const top = style.paddingTop ?? style.paddingVertical ?? style.padding ?? 0;
  const bottom = style.paddingBottom ?? style.paddingVertical ?? style.padding ?? 0;
  if (typeof top !== 'number' || typeof bottom !== 'number') return result;
  const borderTop = style.borderTopWidth ?? style.borderWidth ?? 0;
  const borderBottom = style.borderBottomWidth ?? style.borderWidth ?? 0;
  const available = Math.max(0, height - borderTop - borderBottom - line * fontScale);
  const explicitTop = own?.paddingTop ?? own?.paddingVertical ?? own?.padding;
  const explicitBottom = own?.paddingBottom ?? own?.paddingVertical ?? own?.padding;
  if (top + bottom > available && explicitTop === undefined && explicitBottom === undefined) {
    const ratio = top + bottom > 0 ? available / (top + bottom) : 0;
    result.paddingTop = top * ratio;
    result.paddingBottom = bottom * ratio;
  }
  return result;
}

/** RN Android replaces EditText's background when boxShadow changes. Android's
 * themed Drawable then restores platform padding, discarding the Yoga insets and
 * scrolling a short input's line out of view. Keep shadow paint on a stable View;
 * the real TextInput retains editing, IDs, refs, borders and control semantics. */
export function nativeInputShadowFrame(style: TextStyle, platform: string) {
  if (platform !== 'android') return { input: style, frame: undefined };
  const input = { ...style },
    frame: import('react-native').ViewStyle = {};
  const geometry = [
    'width',
    'minWidth',
    'maxWidth',
    'height',
    'minHeight',
    'maxHeight',
    'flex',
    'flexGrow',
    'flexShrink',
    'flexBasis',
    'alignSelf',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'start',
    'end',
    'inset',
    'insetBlock',
    'insetInline',
    'margin',
    'marginHorizontal',
    'marginVertical',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'marginStart',
    'marginEnd',
    'transform',
    'transformOrigin',
    'zIndex',
    'elevation',
    'boxShadow',
    'opacity',
    'filter',
    'overflow',
  ] as const;
  for (const key of geometry)
    if (style[key] !== undefined) {
      Object.assign(frame, { [key]: style[key] });
      if (!['height', 'minHeight', 'maxHeight'].includes(key)) delete input[key];
    }
  if (frame.width !== undefined) input.width = '100%';
  if (typeof frame.height === 'string') input.height = '100%';
  for (const [key, value] of Object.entries(style))
    if (/^border.*Radius$/.test(key)) Object.assign(frame, { [key]: value });
  return { input, frame };
}
