import Color from 'colorjs.io';
/** CSS relative-OKLCH tint, computed in JS and mapped into the native sRGB gamut. */
export function bubbleTint(primary: string, mode: 'light' | 'dark') {
  const color = new Color(primary).to('oklch');
  color.coords[0] = mode === 'dark' ? 0.3 : 0.93;
  color.coords[1] = (color.coords[1] ?? 0) * 0.4;
  return color.to('srgb').toGamut({ method: 'css' }).toString({ format: 'hex' });
}
