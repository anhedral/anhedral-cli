import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { type PressableProps, type View } from 'react-native';
import { nativeComponent } from './_core';
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
  ...props
}: PressableProps & {
  children: ReactNode;
  ref?: Ref<View>;
  slotVariant?: string;
  slotSize?: string;
}) {
  const child = Children.only(children);
  if (!isValidElement(child)) throw Error('Native composition requires one native element.');
  const element = child as ReactElement<NativeProps>,
    own = element.props,
    component = nativeComponent(element.type),
    buttonLike =
      component &&
      (typeof component === 'function' || typeof component === 'object') &&
      'nativeButtonSlot' in component &&
      component.nativeButtonSlot === true;
  const merged: NativeProps = {
    ...props,
    ...own,
    ref: composeNativeRefs(props.ref, own.ref),
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
    'onLayout',
    'onAccessibilityAction',
  ] as const) {
    const first = own[key],
      second = props[key];
    if (first || second)
      Object.assign(merged, {
        [key]: (event: unknown) => {
          if (typeof first === 'function') first(event as never);
          if (!prevented(event) && typeof second === 'function' && second !== first)
            second(event as never);
        },
      });
  }
  merged.style = (state) => [
    typeof props.style === 'function' ? props.style(state) : props.style,
    typeof own.style === 'function' ? own.style(state) : own.style,
  ];
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
  return cloneElement(element, merged);
}
