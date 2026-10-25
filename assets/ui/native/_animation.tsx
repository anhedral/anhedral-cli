import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** Start static until the native preference is known; a live update wins over an older query. */
export function useNativeReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true,
      revision = 0;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active && revision === 0) setReduced(value);
      })
      .catch(() => {
        /* Preference failures keep motion disabled. */
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      revision++;
      if (active) setReduced(value);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
/** Tailwind pulse: 2 seconds, half opacity at midpoint, native-driver cubic easing. */
export function useNativePulse(reduced: boolean, enabled = true) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(1);
    if (reduced || !enabled) return;
    const timing = { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true };
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { ...timing, toValue: 0.5 }),
        Animated.timing(opacity, { ...timing, toValue: 1 }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      opacity.stopAnimation();
    };
  }, [opacity, reduced, enabled]);
  return opacity;
}
