import { useContext, useEffect, useRef, useImperativeHandle, type Ref } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  type ColorValue,
  type View,
  type ViewProps,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { NativeIconForcedSize } from './_registry-context';
import { Loader2Icon } from 'lucide-react-native';
import { NativeTextStyleContext, useTextTone } from './_core';
import { useNativeReducedMotion } from './_animation';
import { useTheme } from '../theme';

export type SpinnerProps = ViewProps &
  Pick<
    SvgProps,
    'fill' | 'stroke' | 'strokeLinecap' | 'strokeLinejoin' | 'strokeDasharray' | 'strokeDashoffset'
  > & {
    ref?: Ref<View>;
    size?: number | 'small' | 'large';
    color?: ColorValue;
    strokeWidth?: number;
    animating?: boolean;
    hidesWhenStopped?: boolean;
    /** Recipe animation classes control paint independently of loading state. */
    nativeSpin?: boolean;
  };
function NativeSpinner({
  ref,
  size,
  fill,
  stroke,
  strokeLinecap,
  strokeLinejoin,
  strokeDasharray,
  strokeDashoffset,
  children,
  color,
  strokeWidth = 2,
  animating = true,
  hidesWhenStopped = true,
  nativeSpin = true,
  style,
  accessibilityLabel = 'Loading',
  ...props
}: SpinnerProps) {
  const { colors } = useTheme(),
    inherited = useContext(NativeTextStyleContext),
    tone = useTextTone(),
    forcedSize = useContext(NativeIconForcedSize),
    reduced = useNativeReducedMotion(),
    position = useRef(new Animated.Value(0)).current,
    host = useRef<View>(null);
  const visible = animating || !hidesWhenStopped;
  useImperativeHandle(ref, () => host.current!, [visible]);
  const dimension = size === 'small' ? 20 : size === 'large' ? 36 : (size ?? forcedSize ?? 16);
  if (!Number.isFinite(dimension) || dimension < 0)
    throw Error('Native Spinner size must be a finite nonnegative dimension.');
  useEffect(() => {
    position.setValue(0);
    if (reduced || !animating || !nativeSpin) return;
    const animation = Animated.loop(
      Animated.timing(position, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      position.stopAnimation();
    };
  }, [position, reduced, animating, nativeSpin]);
  if (!animating && hidesWhenStopped) return null;
  const flat = StyleSheet.flatten(style);
  if (nativeSpin && animating && !reduced && typeof flat?.transform === 'string')
    throw Error('Animated native Spinner requires native transform arrays.');
  return (
    <Animated.View
      ref={host}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      {...props}
      style={[
        { width: dimension, height: dimension },
        style,
        nativeSpin &&
          animating &&
          !reduced && {
            transform: [
              ...(Array.isArray(flat?.transform) ? flat.transform : []),
              {
                rotate: position.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
      ]}
    >
      <Loader2Icon
        color={color ?? StyleSheet.flatten(inherited.style)?.color ?? tone ?? colors.foreground}
        width="100%"
        height="100%"
        {...(fill === undefined ? {} : { fill })}
        {...(stroke === undefined ? {} : { stroke })}
        {...(strokeLinecap === undefined ? {} : { strokeLinecap })}
        {...(strokeLinejoin === undefined ? {} : { strokeLinejoin })}
        {...(strokeDasharray === undefined ? {} : { strokeDasharray })}
        {...(strokeDashoffset === undefined ? {} : { strokeDashoffset })}
        strokeWidth={strokeWidth}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        {children}
      </Loader2Icon>
    </Animated.View>
  );
}
export const Spinner = Object.assign(NativeSpinner, {
  nativeSpinnerSlot: true,
  nativeRegistryIcon: true,
});
