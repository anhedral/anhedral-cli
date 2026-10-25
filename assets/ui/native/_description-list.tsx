import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { View, Text as NativeText, type ViewProps, type TextProps } from 'react-native';
import { LabelText, content, nativeComponent, plainText } from './_core';
import { Text as ThemedText } from './text';

type DescriptionProps = ViewProps & {
  ref?: Ref<View>;
  descriptionTerms?: string;
};
function isTextContent(nodes: ReactNode): boolean {
  const children = Children.toArray(nodes);
  return (
    children.length > 0 &&
    children.every((child) => {
      if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint')
        return true;
      if (
        !isValidElement<{ children?: ReactNode; onPress?: unknown; onLongPress?: unknown }>(child)
      )
        return false;
      if (
        typeof child.props.onPress === 'function' ||
        typeof child.props.onLongPress === 'function'
      )
        return false;
      const component = nativeComponent(child.type),
        kind =
          (typeof child.type === 'function' || typeof child.type === 'object') &&
          'nativeRegistryKind' in child.type
            ? child.type.nativeRegistryKind
            : undefined;
      return (
        (child.type === Fragment ||
          component === NativeText ||
          component === LabelText ||
          component === ThemedText ||
          kind === 'text') &&
        isTextContent(child.props.children)
      );
    })
  );
}
/** Native terms and definition labels retain association without DOM dl/dt/dd elements. */
export function NativeDescriptionList({ children, ...props }: ViewProps & { ref?: Ref<View> }) {
  let terms: string[] = [],
    afterDefinition = false;
  const visit = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (
        !isValidElement<{ children?: ReactNode; nativeID?: string; accessibilityLabel?: string }>(
          child,
        )
      )
        return child;
      const component = nativeComponent(child.type);
      if (component === NativeDescriptionList) return child;
      if (component === NativeDescriptionTerm) {
        if (afterDefinition) terms = [];
        afterDefinition = false;
        terms.push(child.props.accessibilityLabel ?? plainText(child.props.children));
        return child;
      }
      if (component === NativeDescriptionDetails) {
        afterDefinition = true;
        return cloneElement(child as ReactElement<DescriptionProps>, {
          descriptionTerms: terms.filter(Boolean).join(', '),
        });
      }
      return child.props.children !== undefined || child.type === Fragment
        ? cloneElement(child, { children: visit(child.props.children) })
        : child;
    });
  return <View {...props}>{content(visit(children))}</View>;
}
export function NativeDescriptionTerm(props: TextProps & { ref?: Ref<NativeText> }) {
  return <LabelText accessible role="term" {...props} />;
}
export function NativeDescriptionDetails({
  descriptionTerms,
  children,
  ...props
}: DescriptionProps) {
  const value = plainText(children),
    interactive = !isTextContent(children);
  return (
    <View
      {...props}
      role={props.role ?? 'definition'}
      accessible={props.accessible ?? !interactive}
      accessibilityLabel={
        props.accessibilityLabel ??
        (!interactive && descriptionTerms && value ? descriptionTerms + ': ' + value : undefined)
      }
    >
      {content(children)}
    </View>
  );
}
