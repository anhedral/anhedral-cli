import {
  useContext,
  type Ref,
  type ReactNode,
  Children,
  Fragment,
  isValidElement,
  cloneElement,
} from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme';
import { useNativeFieldPart } from './_field-context';
import {
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  LabelText,
  plainText,
  useTextTone,
} from './_core';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
} from './_registry-context';
import { nativePresetLabelStyle } from './_preset-label-style';
const textKeys = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'includeFontPadding',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textAlignVertical',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'writingDirection',
  'verticalAlign',
  'userSelect',
]);
export type LabelProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  controlID?: string;
  ref?: Ref<View>;
};
/** Native field association replaces DOM lookup and peer/group selectors. */
export function Label({ children, onPress, controlID, style, disabled, ...props }: LabelProps) {
  const { field, nativeID } = useNativeFieldPart('label', children, props.nativeID, controlID);
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    generation = useRegistryPalette(),
    inherited = useContext(NativeTextStyleContext),
    inheritedTone = useTextTone();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  const control = field?.controlPropertiesFor(controlID),
    own = StyleSheet.flatten(style);
  const adapted = nativePresetLabelStyle(preset, {
    ...theme,
    groupDisabled: field?.disabled,
    peerDisabled: control?.disabled,
    peerSlot: control?.slot,
    source: origin === 'aria' || origin === 'radix' ? origin : 'base',
  });
  const ownText = Object.fromEntries(
    Object.entries(own ?? {}).filter(([key]) => textKeys.has(key)),
  ) as TextStyle;
  const ownView = Object.fromEntries(
    Object.entries(own ?? {}).filter(([key]) => !textKeys.has(key)),
  );
  const metrics = { ...adapted.text };
  if (ownText.fontSize !== undefined && ownText.lineHeight === undefined)
    metrics.lineHeight =
      ((adapted.text.lineHeight ?? adapted.text.fontSize ?? 14) * ownText.fontSize) /
      (adapted.text.fontSize ?? 14);
  if (
    ownText.fontSize !== undefined &&
    ownText.letterSpacing === undefined &&
    typeof adapted.paint.letterSpacingEm === 'number'
  )
    metrics.letterSpacing = ownText.fontSize * adapted.paint.letterSpacingEm;
  const body = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) =>
      typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint' ? (
        <LabelText accessible={!field}>{String(child)}</LabelText>
      ) : isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? (
        cloneElement(child, { children: body(child.props.children) })
      ) : (
        child
      ),
    );
  return (
    <NativeTextStyleProvider value={{ ...inherited, style: [inherited.style, metrics, ownText] }}>
      <TextToneProvider value={typeof ownText.color === 'string' ? ownText.color : inheritedTone}>
        <Pressable
          {...props}
          nativeID={nativeID}
          accessibilityRole={props.accessibilityRole ?? 'text'}
          accessibilityLabel={props.accessibilityLabel ?? (field ? undefined : plainText(children))}
          accessible={props.accessible ?? !field}
          disabled={disabled || adapted.blocksPointerEvents}
          style={[{ flexDirection: 'row', alignItems: 'center' }, adapted.view, ownView]}
          onPress={(event) => {
            onPress?.(event);
            if (event.isDefaultPrevented()) return;
            const target = controlID
              ? field?.controls.current.get(controlID)
              : field?.control.current;
            if (target?.activate) target.activate();
            else target?.focus?.();
          }}
        >
          {body(children)}
        </Pressable>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
Object.assign(Label, { nativeTextSlot: true });
