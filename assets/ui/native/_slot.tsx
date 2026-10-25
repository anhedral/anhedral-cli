import {
  Children,
  Fragment,
  createElement,
  useState,
  useMemo,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
  type TextProps,
} from 'react-native';
import { nativeComponent, content } from './_core';
type NativeProps = PressableProps & {
  ref?: Ref<View>;
  children?: ReactNode;
  variant?: string;
  size?: string;
  inline?: boolean;
};
function prevented(event: unknown) {
  return (
    !!event &&
    typeof event === 'object' &&
    'isDefaultPrevented' in event &&
    typeof event.isDefaultPrevented === 'function' &&
    event.isDefaultPrevented()
  );
}
export function nativeTextPressRetentionOffset(
  value: PressableProps['pressRetentionOffset'],
): TextProps['pressRetentionOffset'] {
  if (value == null) return undefined;
  return typeof value === 'number'
    ? { top: value, left: value, bottom: value, right: value }
    : {
        top: value.top ?? 0,
        left: value.left ?? 0,
        bottom: value.bottom ?? 0,
        right: value.right ?? 0,
      };
}
function removeInheritedStyle(
  value: StyleProp<ViewStyle>,
  inherited: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  if (inherited !== undefined && value === inherited) return undefined;
  return Array.isArray(value)
    ? (value as readonly StyleProp<ViewStyle>[]).map((part) =>
        removeInheritedStyle(part, inherited),
      )
    : value;
}
export function composeNativeRefs<T>(...input: (Ref<T> | undefined)[]) {
  const all = [...new Set(input.filter((ref): ref is NonNullable<Ref<T>> => ref != null))];
  return (node: T | null) => {
    const cleanup: (() => void)[] = [];
    for (const ref of all) {
      if (typeof ref === 'function') {
        const release = ref(node);
        if (node) cleanup.push(typeof release === 'function' ? release : () => ref(null));
      } else {
        ref.current = node;
        if (node)
          cleanup.push(() => {
            ref.current = null;
          });
      }
    }
    if (node)
      return () => {
        for (const release of cleanup) release();
      };
  };
}
export function NativeSlot({
  children,
  slotVariant,
  slotSize,
  slotStyle = 'pressable',
  slotInheritedStyle,
  ...props
}: PressableProps & {
  children: ReactNode;
  ref?: Ref<View>;
  slotVariant?: string;
  slotSize?: string;
  slotStyle?: 'pressable' | 'static';
  slotInheritedStyle?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const child = Children.only(children);
  if (!isValidElement(child) || child.type === Fragment)
    throw Error('Native composition requires one native host element.');
  const element = child as ReactElement<NativeProps>,
    own = element.props,
    component = nativeComponent(element.type),
    buttonLike =
      component &&
      (typeof component === 'function' || typeof component === 'object') &&
      'nativeButtonSlot' in component &&
      component.nativeButtonSlot === true;
  const composedRef = useMemo(() => composeNativeRefs(props.ref, own.ref), [props.ref, own.ref]);
  const merged: NativeProps = {
    ...props,
    ...own,
    ref: composedRef,
    disabled: props.disabled || own.disabled,
    accessibilityState: {
      ...props.accessibilityState,
      ...own.accessibilityState,
      ...(props.disabled || own.disabled ? { disabled: true } : {}),
    },
  };
  for (const key of [
    'onPress',
    'onLongPress',
    'onPressIn',
    'onPressOut',
    'onFocus',
    'onBlur',
    'onHoverIn',
    'onHoverOut',
    'onPointerEnter',
    'onPointerLeave',
    'onPointerDown',
    'onPointerMove',
    'onPointerUp',
    'onPointerCancel',
    'onTouchStart',
    'onTouchMove',
    'onTouchEnd',
    'onTouchCancel',
    'onLayout',
    'onAccessibilityAction',
  ] as const) {
    const first = own[key],
      second = props[key];
    if (
      first ||
      second ||
      (slotStyle === 'static' && (key === 'onPressIn' || key === 'onPressOut'))
    )
      Object.assign(merged, {
        [key]: (event: unknown) => {
          if (slotStyle === 'static' && key === 'onPressIn') setPressed(true);
          if (slotStyle === 'static' && key === 'onPressOut') setPressed(false);
          if (typeof first === 'function') first(event as never);
          if (!prevented(event) && typeof second === 'function' && second !== first)
            second(event as never);
        },
      });
  }
  const resolveStyle = (state: PressableStateCallbackType) => [
    typeof props.style === 'function' ? props.style(state) : props.style,
    removeInheritedStyle(
      typeof own.style === 'function' ? own.style(state) : own.style,
      slotInheritedStyle,
    ),
  ];
  merged.style =
    slotStyle === 'static'
      ? resolveStyle({
          pressed: !!pressed && !merged.disabled && !merged.accessibilityState?.disabled,
        })
      : resolveStyle;
  if (buttonLike) {
    merged.variant = own.variant ?? slotVariant;
    merged.size = own.size ?? slotSize;
  }
  if (
    component &&
    (typeof component === 'function' || typeof component === 'object') &&
    'nativeLinkSlot' in component &&
    component.nativeLinkSlot === true &&
    slotVariant !== undefined
  )
    merged.inline = false;
  if (component === View && typeof merged.onPress === 'function')
    return createElement(Pressable, {
      ...merged,
      hitSlop: merged.hitSlop ?? 16,
      key: element.key,
      children: content(own.children),
    });
  return cloneElement(element, merged);
}
