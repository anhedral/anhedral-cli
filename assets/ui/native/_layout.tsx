import { cloneElement, isValidElement, type ReactElement, type ReactNode, type Ref } from 'react';
import { View, type ViewProps } from 'react-native';
import { NativeSlot } from './_slot';
import { content, nativeComponent } from './_core';
export type NativeLayoutRenderProps = ViewProps;
export type NativeLayoutProps = ViewProps & {
  ref?: Ref<View>;
  asChild?: boolean;
  render?:
    | ReactElement<{ children?: ReactNode }>
    | ((props: NativeLayoutRenderProps) => ReactElement<{ children?: ReactNode }>);
};
/** One native layout host; callback props contain native values rather than DOM fields. */
export function NativeLayout({ asChild = false, render, children, ...props }: NativeLayoutProps) {
  const { ref, ...renderProps } = props;
  const rendered = typeof render === 'function' ? render({ ...renderProps, children }) : render;
  if (render !== undefined || asChild) {
    const child = render !== undefined ? rendered : children;
    let resolved =
      isValidElement<{ children?: ReactNode }>(child) &&
      child.props.children === undefined &&
      children !== undefined &&
      !asChild
        ? cloneElement(child, { children })
        : child;
    if (
      isValidElement<{ children?: ReactNode }>(resolved) &&
      nativeComponent(resolved.type) === View
    )
      resolved = cloneElement(resolved, { children: content(resolved.props.children) });
    return (
      <NativeSlot
        {...props}
        slotStyle="static"
        slotInheritedStyle={typeof render === 'function' ? props.style : undefined}
      >
        {resolved}
      </NativeSlot>
    );
  }
  return <View {...props}>{content(children)}</View>;
}
