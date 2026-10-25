import { useId } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Color from 'colorjs.io';
export type NativeGradientPaint = Readonly<Record<string, string | number | undefined>>;
const directions = {
  t: ['0%', '100%', '0%', '0%'],
  tr: ['0%', '100%', '100%', '0%'],
  r: ['0%', '0%', '100%', '0%'],
  br: ['0%', '0%', '100%', '100%'],
  b: ['0%', '0%', '0%', '100%'],
  bl: ['100%', '0%', '0%', '100%'],
  l: ['100%', '0%', '0%', '0%'],
  tl: ['100%', '100%', '0%', '0%'],
} as const;
export function nativeRegistryGradient(paint: NativeGradientPaint) {
  const direction = paint.gradientDirection;
  if (direction === undefined) return null;
  if (typeof direction !== 'string' || !(direction in directions))
    throw Error('Unreviewed native gradient direction: ' + direction);
  const normalize = (key: string) => {
    const value = paint[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw Error('Invalid native gradient color: ' + key);
    const parsed = new Color(value).to('srgb').toGamut({ method: 'css' }),
      opacity = parsed.alpha;
    // react-native-svg derives native stop alpha from stopOpacity, not stopColor.
    parsed.alpha = 1;
    return { color: parsed.toString({ format: 'hex' }), opacity };
  };
  const from = normalize('gradientFrom'),
    via = normalize('gradientVia'),
    to = normalize('gradientTo');
  const offset = (key: string, fallback: number) => {
    const value = paint[key] ?? fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
      throw Error('Native gradient stops require finite positions from 0% through 100%.');
    return value;
  };
  const first = offset('gradientFromOffset', 0),
    last = offset('gradientToOffset', 1),
    middle = offset('gradientViaOffset', (first + last) / 2);
  const stops = [
    { offset: first, ...(from ?? { color: (via ?? to)?.color ?? '#000000', opacity: 0 }) },
  ];
  if (via !== undefined) stops.push({ offset: Math.max(first, middle), ...via });
  stops.push({
    offset: Math.max(stops[stops.length - 1]!.offset, last),
    ...(to ?? { color: (via ?? from)?.color ?? '#000000', opacity: 0 }),
  });
  const [x1, y1, x2, y2] = directions[direction as keyof typeof directions];
  return { x1, y1, x2, y2, stops };
}
export function NativeRegistryBackground({
  paint,
  style,
}: {
  paint: NativeGradientPaint;
  style?: StyleProp<ViewStyle>;
}) {
  const identity = useId(),
    gradient = nativeRegistryGradient(paint);
  if (!gradient) return null;
  const id = 'native-gradient-' + identity.replace(/[^a-zA-Z0-9_-]/g, ''),
    frame = StyleSheet.flatten(style);
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: frame?.borderRadius,
          borderTopLeftRadius: frame?.borderTopLeftRadius,
          borderTopRightRadius: frame?.borderTopRightRadius,
          borderBottomLeftRadius: frame?.borderBottomLeftRadius,
          borderBottomRightRadius: frame?.borderBottomRightRadius,
          overflow: 'hidden',
        },
      ]}
    >
      <Svg width="100%" height="100%" accessible={false} pointerEvents="none">
        <Defs>
          <LinearGradient
            id={id}
            x1={gradient.x1}
            y1={gradient.y1}
            x2={gradient.x2}
            y2={gradient.y2}
          >
            {gradient.stops.map((stop, index) => (
              <Stop
                key={index}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={'url(#' + id + ')'} />
      </Svg>
    </View>
  );
}
