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
