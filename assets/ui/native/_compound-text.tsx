import {
  Children,
  Fragment,
  cloneElement,
  createElement,
  isValidElement,
  useContext,
  type ReactNode,
  type ComponentProps,
} from 'react';
import { StyleSheet, type TextStyle, type ViewStyle, type StyleProp } from 'react-native';
import {
  nativeComponent,
  LabelText,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  useTextTone,
} from './_core';
import { NativeLink } from './navigation';
import { withRegistryStyles } from './registry-styles';
import type { nativePresetStyle } from './_preset-style';
import type { NativeFontRole } from './fonts';
type TextPaint = Record<string, string | number | undefined>;
const StyledLink = withRegistryStyles(NativeLink, 'link');
export function flat(children: ReactNode, result: ReactNode[] = [], prefix = ''): ReactNode[] {
  for (const node of Children.toArray(children)) {
    if (
      isValidElement<{ children?: ReactNode }>(node) &&
      (node.type === Fragment ||
        ((typeof node.type === 'function' || typeof node.type === 'object') &&
          'nativeRegistryTransparent' in node.type &&
          node.type.nativeRegistryTransparent === true))
    )
      flat(node.props.children, result, prefix + String(node.key) + '/');
    else
      result.push(
        isValidElement(node) ? cloneElement(node, { key: prefix + String(node.key) }) : node,
      );
  }
  return result;
}
function inline(node: ReactNode) {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return true;
  if (!isValidElement(node)) return false;
  const owner = nativeComponent(node.type);
  if (owner === LabelText) return true;
  return (
    (typeof node.type === 'function' || typeof node.type === 'object') &&
    'nativeRegistryKind' in node.type &&
    ['text', 'span', 'link'].includes(String(node.type.nativeRegistryKind))
  );
}
export function flow(children: ReactNode) {
  const out: ReactNode[] = [],
    run: ReactNode[] = [];
  const flush = () => {
    if (run.length)
      out.push(<LabelText key={'text-' + out.length}>{Children.toArray(run.splice(0))}</LabelText>);
  };
  for (const node of flat(children)) {
    if (inline(node)) run.push(node);
    else {
      flush();
      out.push(node);
    }
  }
  flush();
  return Children.toArray(out);
}
export function links(children: ReactNode) {
  return flat(children).map((node) => {
    if (!isValidElement<ComponentProps<typeof NativeLink> & { className?: string }>(node))
      return node;
    const owner = nativeComponent(node.type);
    if (owner !== NativeLink) return node;
    const props = {
      ...node.props,
      className: ['underline underline-offset-4 hover:text-primary', node.props.className]
        .filter(Boolean)
        .join(' '),
    };
    return node.type === NativeLink
      ? createElement(StyledLink, { ...props, key: node.key })
      : cloneElement(node, props);
  });
}
export { nativeContainerStyle as itemStyle } from './_native-style';
export function TextScope({
  children,
  paint,
  textStyle,
  nativeTextPaint,
}: {
  children: ReactNode;
  paint: ReturnType<typeof nativePresetStyle>;
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: TextPaint;
}) {
  const parent = useContext(NativeTextStyleContext),
    tone = useTextTone(),
    own = StyleSheet.flatten(textStyle),
    text = StyleSheet.flatten([parent.style, paint.text, textStyle]),
    effects = { ...paint.paint, ...nativeTextPaint };
  if (
    own?.lineHeight === undefined &&
    typeof effects.lineHeightMultiplier === 'number' &&
    effects.lineHeightMultiplier > 0
  )
    text.lineHeight = (text.fontSize ?? 14) * effects.lineHeightMultiplier;
  if (own?.letterSpacing === undefined && typeof effects.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * effects.letterSpacingEm;
  const role = effects.fontRole,
    fontRole: NativeFontRole | undefined =
      role === 'sans' || role === 'serif' || role === 'mono' || role === 'heading'
        ? role
        : (paint.fontRole ?? parent.fontRole);
  return (
    <NativeTextStyleProvider
      value={{
        ...parent,
        style: text,
        fontRole,
        numberOfLines: typeof effects.lines === 'number' ? effects.lines : parent.numberOfLines,
        textBreakStrategy:
          effects.textBreakStrategy === 'balanced'
            ? 'balanced'
            : effects.textBreakStrategy === 'highQuality'
              ? 'highQuality'
              : parent.textBreakStrategy,
      }}
    >
      <TextToneProvider
        value={
          text.color === undefined ? tone : typeof text.color === 'string' ? text.color : undefined
        }
      >
        {children}
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
