import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type ViewProps,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import {
  content,
  nativeComponent,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  useDirection,
} from './_core';
import { Input, type InputProps } from './input';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
import { useNativeField } from './_field-context';
import { NativeKbdSurfaceContext } from './_kbd-context';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
  NativeButtonIconSize,
  NativeComponentStyleProvider,
} from './_registry-context';
import {
  nativePresetInputGroupStyle,
  type NativeInputGroupState,
  type NativeInputGroupSlot,
} from './_preset-input-group-style';
import {
  NativeInputGroupContext,
  NativeInputGroupDirectChild,
  NativeInputGroupSurface,
  NativeInputGroupAddonContext,
  NativeInputGroupKbdPaint,
  NativeInputGroupHostBoundary,
  useNativeInputGroupMetadata,
  type NativeInputGroupMetadata,
  type NativeInputGroupAlign,
  type NativeInputGroupOwner,
} from './_input-group-context';
type GroupViewProps = ViewProps & {
  ref?: Ref<View>;
  textStyle?: StyleProp<TextStyle>;
};
function useGroup() {
  return useContext(NativeInputGroupContext);
}
function useSlot(
  slot: NativeInputGroupSlot,
  state: Partial<NativeInputGroupState> = {},
  textStyle?: StyleProp<TextStyle>,
) {
  const theme = useTheme(),
    origin = useNativeRegistrySource(),
    requested = useNativeComponentStyle(),
    generation = useRegistryPalette(),
    inherited = useContext(NativeTextStyleContext),
    surface = useContext(NativeInputGroupSurface),
    window = useWindowDimensions();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  const adapted = nativePresetInputGroupStyle(preset, slot, {
    ...theme,
    fontScale: window.fontScale,
    ...state,
    inCombobox: surface.inCombobox,
    inheritedBorderColor: surface.borderColor,
  });
  const own = StyleSheet.flatten(textStyle),
    text = StyleSheet.flatten([inherited.style, adapted.text, textStyle]);
  if (own?.lineHeight === undefined && typeof adapted.paint.lineHeightMultiplier === 'number')
    text.lineHeight = (text.fontSize ?? 14) * adapted.paint.lineHeightMultiplier;
  if (own?.letterSpacing === undefined && typeof adapted.paint.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * adapted.paint.letterSpacingEm;
  return {
    ...adapted,
    preset,
    text,
    fontRole: adapted.fontRole ?? inherited.fontRole,
    inherited,
  };
}
function flatChildren(children: ReactNode, prefix = ''): ReactNode[] {
  return Children.toArray(children).flatMap((node) => {
    if (!isValidElement<{ children?: ReactNode }>(node)) return [node];
    const key = prefix + String(node.key);
    return node.type === Fragment
      ? flatChildren(node.props.children, key + '/')
      : [cloneElement(node, { key })];
  });
}
function groupState(group: NativeInputGroupOwner | null): Partial<NativeInputGroupState> {
  if (!group) return {};
  return {
    focused: group.focused,
    focusWithin: group.focusWithin,
    invalid: group.hasInvalid,
    hasDisabled: group.hasDisabled,
    groupDisabled: group?.disabled,
    hasInput: group.hasInput,
    hasTextarea: group.hasTextarea,
    hasTextareaAny: group.hasTextareaAny,
    inlineStart: group.inlineStart,
    inlineEnd: group.inlineEnd,
    blockStart: group.blockStart,
    blockEnd: group.blockEnd,
    blockStartAny: group.blockStartAny,
    blockEndAny: group.blockEndAny,
  };
}
export function InputGroup({
  children,
  style,
  textStyle,
  disabled = false,
  invalid = false,
  ...props
}: GroupViewProps & { disabled?: boolean; invalid?: boolean }) {
  const [controls, setControls] = useState(new Map<string, NativeInputGroupMetadata>()),
    keyboard = useContext(NativeKbdSurfaceContext),
    { fontScale } = useWindowDimensions();
  const update = useCallback(
    (id: string, value: NativeInputGroupMetadata) =>
      setControls((previous) => {
        const old = previous.get(id);
        if (
          old &&
          Object.keys(value).every(
            (key) =>
              old[key as keyof NativeInputGroupMetadata] ===
              value[key as keyof NativeInputGroupMetadata],
          )
        )
          return previous;
        const next = new Map(previous);
        next.set(id, value);
        return next;
      }),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setControls((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Map(previous);
        next.delete(id);
        return next;
      }),
    [],
  );
  const entries = [...controls.values()],
    hasAlign = (align: NativeInputGroupAlign, direct = true) =>
      entries.some(
        (entry) => entry.kind === 'addon' && entry.align === align && (!direct || entry.direct),
      );
  const group: NativeInputGroupOwner = {
    disabled,
    invalid,
    hasInvalid: invalid || entries.some((entry) => entry.invalid),
    focused: entries.some(
      (entry) =>
        (entry.kind === 'input' || entry.kind === 'textarea') && entry.control && entry.focused,
    ),
    focusWithin: entries.some((entry) => entry.focused),
    hasDisabled: disabled || entries.some((entry) => entry.disabled),
    hasInput: entries.some((entry) => entry.kind === 'input' && entry.direct),
    hasTextarea: entries.some((entry) => entry.kind === 'textarea' && entry.direct),
    hasTextareaAny: entries.some((entry) => entry.kind === 'textarea'),
    inlineStart: hasAlign('inline-start'),
    inlineEnd: hasAlign('inline-end'),
    blockStart: hasAlign('block-start'),
    blockEnd: hasAlign('block-end'),
    blockStartAny: hasAlign('block-start', false),
    blockEndAny: hasAlign('block-end', false),
    vertical:
      StyleSheet.flatten(style)?.flexDirection === 'column' ||
      hasAlign('block-start') ||
      hasAlign('block-end'),
    controls,
    update,
    remove,
  };
  const direction = useDirection();
  const source = useSlot('InputGroup', groupState(group), textStyle),
    nodes = flatChildren(children);
  const order = (node: ReactNode): number => {
    if (
      !isValidElement<{
        align?: NativeInputGroupAlign;
        children?: ReactNode;
        asChild?: boolean;
        render?: ReactNode;
      }>(node)
    )
      return 0;
    const owner = nativeComponent(node.type);
    if (owner === InputGroupAddon)
      return (node.props.align ?? 'inline-start').endsWith('start') ? -1 : 1;
    if (!owner || (typeof owner !== 'function' && typeof owner !== 'object')) return 0;
    if ('nativeLayoutTransparent' in owner && owner.nativeLayoutTransparent === true)
      return (
        flatChildren(node.props.children)
          .map(order)
          .find((value) => value !== 0) ?? 0
      );
    if ('nativeLayoutActivator' in owner && owner.nativeLayoutActivator === true)
      return order(flatChildren(node.props.children)[0]);
    if ('nativeLayoutSlot' in owner && owner.nativeLayoutSlot === true)
      return order(
        node.props.asChild
          ? flatChildren(node.props.children)[0]
          : isValidElement(node.props.render)
            ? node.props.render
            : undefined,
      );
    return 0;
  };
  const sorted = nodes
    .map((node, index) => ({ node, index, order: order(node) }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.node);
  const measured = Math.max(0, ...entries.map((entry) => entry.height ?? 0));
  const scaled =
    fontScale > 1 && typeof source.view.height === 'number'
      ? { height: Math.max(source.view.height, measured) }
      : undefined;
  return (
    <NativeComponentStyleProvider style={source.preset}>
      <NativeInputGroupContext.Provider value={group}>
        <NativeKbdSurfaceContext.Provider value={{ ...keyboard, inputGroup: true }}>
          <NativeTextStyleProvider
            value={{
              ...source.inherited,
              style: source.text,
              fontRole: source.fontRole,
            }}
          >
            <TextToneProvider
              value={typeof source.text.color === 'string' ? source.text.color : undefined}
            >
              <View
                {...props}
                role={props.role ?? 'group'}
                style={[source.view, { direction }, scaled, style]}
              >
                <NativeInputGroupHostBoundary>
                  <NativeInputGroupDirectChild.Provider value>
                    {content(sorted)}
                  </NativeInputGroupDirectChild.Provider>
                </NativeInputGroupHostBoundary>
              </View>
            </TextToneProvider>
          </NativeTextStyleProvider>
        </NativeKbdSurfaceContext.Provider>
      </NativeInputGroupContext.Provider>
    </NativeComponentStyleProvider>
  );
}
InputGroup.nativeExampleContainer = true;
InputGroup.nativeContainerTextSlot = true;
export function InputGroupAddon({
  align = 'inline-start',
  style,
  textStyle,
  children,
  onPress,
  onLayout,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  align?: NativeInputGroupAlign;
  style?: StyleProp<import('react-native').ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
  ref?: Ref<View>;
}) {
  const group = useGroup(),
    [presence, setPresence] = useState(new Map<string, 'button' | 'kbd'>()),
    [height, setHeight] = useState(0);
  const update = useCallback(
      (id: string, kind: 'button' | 'kbd') =>
        setPresence((previous) => {
          if (previous.get(id) === kind) return previous;
          const next = new Map(previous);
          next.set(id, kind);
          return next;
        }),
      [],
    ),
    remove = useCallback(
      (id: string) =>
        setPresence((previous) => {
          if (!previous.has(id)) return previous;
          const next = new Map(previous);
          next.delete(id);
          return next;
        }),
      [],
    );
  const own = StyleSheet.flatten(style),
    source = useSlot(
      'InputGroupAddon',
      {
        ...groupState(group),
        align,
        hasButton: [...presence.values()].includes('button'),
        hasKbd: [...presence.values()].includes('kbd'),
        borderTop: Number(own?.borderTopWidth ?? own?.borderWidth ?? 0) > 0,
        borderBottom: Number(own?.borderBottomWidth ?? own?.borderWidth ?? 0) > 0,
      },
      textStyle,
    );
  useNativeInputGroupMetadata({ kind: 'addon', align, height });
  // A native inner Pressable owns its gesture. Forward an explicitly composed
  // addon activator to immediate button slots, preserving child-first cancellation.
  const activators = {
    onPress,
    onLongPress: props.onLongPress,
    onAccessibilityAction: props.onAccessibilityAction,
  };
  const buttonChildren = flatChildren(children).map((node) => {
    if (!isValidElement<PressableProps>(node)) return node;
    const owner = nativeComponent(node.type);
    if (
      owner !== InputGroupButton &&
      !(
        owner &&
        (typeof owner === 'function' || typeof owner === 'object') &&
        'nativeButtonSlot' in owner &&
        owner.nativeButtonSlot === true
      )
    )
      return node;
    const patch: Partial<PressableProps> = {};
    if (onPress || props.onLongPress || props.onAccessibilityAction) {
      patch.disabled = !!(
        props.disabled ||
        node.props.disabled ||
        props.accessibilityState?.disabled ||
        node.props.accessibilityState?.disabled
      );
      patch.accessibilityState = {
        ...props.accessibilityState,
        ...node.props.accessibilityState,
        disabled: patch.disabled,
      };
      for (const key of [
        'accessibilityRole',
        'accessibilityLabel',
        'accessibilityHint',
        'delayLongPress',
      ] as const)
        if (node.props[key] === undefined && props[key] !== undefined)
          Object.assign(patch, { [key]: props[key] });
    }
    for (const key of ['onPress', 'onLongPress', 'onAccessibilityAction'] as const) {
      const ancestor = activators[key],
        own = node.props[key];
      if (!ancestor) continue;
      Object.assign(patch, {
        [key]: (event: { isDefaultPrevented: () => boolean }) => {
          own?.(event as never);
          if (!event.isDefaultPrevented() && ancestor !== own) ancestor(event as never);
        },
      });
    }
    if (props.accessibilityActions)
      patch.accessibilityActions = [
        ...(node.props.accessibilityActions ?? []),
        ...props.accessibilityActions.filter(
          (action) => !node.props.accessibilityActions?.some((own) => own.name === action.name),
        ),
      ];
    return cloneElement(node, patch);
  });

  return (
    <NativeTextStyleProvider
      value={{
        ...source.inherited,
        style: source.text,
        fontRole: source.fontRole,
      }}
    >
      <TextToneProvider
        value={typeof source.text.color === 'string' ? source.text.color : undefined}
      >
        <NativeButtonIconSize.Provider value={source.iconSize}>
          <Pressable
            {...props}
            accessible={props.accessible ?? false}
            onLayout={(event) => {
              const next = event.nativeEvent.layout.height;
              if (Number.isFinite(next) && next >= 0)
                setHeight((previous) => (previous === next ? previous : next));
              onLayout?.(event);
            }}
            onPress={(event) => {
              if (onPress) {
                onPress(event);
                return;
              }
              const control = [...(group?.controls.values() ?? [])].find(
                (entry) =>
                  (entry.kind === 'input' || entry.kind === 'textarea') && entry.ref?.current,
              );
              if (!group?.disabled && !control?.disabled) control?.ref?.current?.focus();
            }}
            style={[source.view, style]}
          >
            <NativeInputGroupHostBoundary>
              <NativeInputGroupAddonContext.Provider value={{ update, remove }}>
                <NativeInputGroupKbdPaint.Provider
                  value={{
                    direct: source.kbdDirect,
                    descendant: source.kbdDescendant,
                  }}
                >
                  {content(buttonChildren)}
                </NativeInputGroupKbdPaint.Provider>
              </NativeInputGroupAddonContext.Provider>
            </NativeInputGroupHostBoundary>
          </Pressable>
        </NativeButtonIconSize.Provider>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
InputGroupAddon.nativeContainerTextSlot = true;
function inlineTextContent(children: ReactNode) {
  const runs: ReactNode[] = [];
  for (const node of flatChildren(children)) {
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
      const last = runs.at(-1);
      if (typeof last === 'string') runs[runs.length - 1] = last + String(node);
      else runs.push(String(node));
    } else runs.push(node);
  }
  return content(runs);
}
const textKeys = new Set([
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textAlign',
  'textDecorationLine',
  'textDecorationColor',
  'textDecorationStyle',
  'includeFontPadding',
  'writingDirection',
  'verticalAlign',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textAlignVertical',
  'userSelect',
]);
export function InputGroupText({
  children,
  style,
  textStyle,
  ...props
}: Omit<GroupViewProps, 'style'> & { style?: StyleProp<TextStyle> }) {
  const own = StyleSheet.flatten(style),
    ownText = Object.fromEntries(Object.entries(own ?? {}).filter(([key]) => textKeys.has(key))),
    ownView = Object.fromEntries(Object.entries(own ?? {}).filter(([key]) => !textKeys.has(key))),
    source = useSlot('InputGroupText', {}, [ownText, textStyle]);
  return (
    <NativeTextStyleProvider
      value={{
        ...source.inherited,
        style: source.text,
        fontRole: source.fontRole,
      }}
    >
      <TextToneProvider
        value={typeof source.text.color === 'string' ? source.text.color : undefined}
      >
        <NativeButtonIconSize.Provider value={source.iconSize}>
          <View {...props} style={[source.view, ownView]}>
            <NativeInputGroupHostBoundary>
              {inlineTextContent(children)}
            </NativeInputGroupHostBoundary>
          </View>
        </NativeButtonIconSize.Provider>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
InputGroupText.nativeContainerTextSlot = true;
type GroupButtonProps = Omit<ButtonProps, 'size'> & {
  size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
};
export function InputGroupButton({
  size = 'xs',
  variant = 'ghost',
  type = 'button',
  children,
  disabled,
  ...props
}: GroupButtonProps) {
  const group = useGroup(),
    source = useSlot('InputGroupButton', { ...groupState(group), size }),
    { preset } = source;
  return (
    <NativeComponentStyleProvider style={preset}>
      <Button
        {...props}
        type={type}
        variant={variant}
        disabled={group?.disabled || disabled}
        nativeCompoundStyle={(state) => ({
          classes: nativePresetInputGroupStyle(preset, 'InputGroupButton', {
            ...groupState(group),
            ...state,
            size,
          }).classes,
          iconOnly: size.startsWith('icon'),
          inheritedForeground:
            typeof source.text.color === 'string' ? source.text.color : undefined,
        })}
      >
        {children}
      </Button>
    </NativeComponentStyleProvider>
  );
}
InputGroupButton.nativeContainerTextSlot = true;
function GroupControl({
  kind,
  ref,
  style,
  invalid: ownInvalid,
  editable,
  onFocus,
  onBlur,
  onLayout,
  ...props
}: InputProps & { kind: 'input' | 'textarea' }) {
  const group = useGroup(),
    field = useNativeField(),
    invalid = ownInvalid ?? field?.invalid ?? group?.invalid,
    disabled =
      group?.disabled ||
      !!props.accessibilityState?.disabled ||
      (editable === false && !props.readOnly),
    [focused, setFocused] = useState(false),
    state = groupState(group);
  const source = useSlot(kind === 'input' ? 'InputGroupInput' : 'InputGroupTextarea', {
      ...state,
      invalid,
      disabled,
      focused,
    }),
    root = useSlot('InputGroup', state);
  const intrinsic = group?.vertical ? { flexBasis: 'auto' as const } : undefined;
  return (
    <Input
      {...props}
      ref={ref}
      nativePreset
      nativeGroupControl
      nativeFieldKind={kind}
      multiline={kind === 'textarea' || props.multiline}
      textAlignVertical={
        kind === 'textarea' ? (props.textAlignVertical ?? 'top') : props.textAlignVertical
      }
      editable={disabled ? false : editable}
      invalid={invalid}
      accessibilityState={{ ...props.accessibilityState, disabled }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onLayout={onLayout}
      style={[source.view, kind === 'input' && root.control, intrinsic, style]}
    />
  );
}
export function InputGroupInput(props: InputProps) {
  return <GroupControl {...props} kind="input" />;
}
export function InputGroupTextarea({ rows, ...props }: InputProps & { rows?: number }) {
  return <GroupControl {...props} nativeRows={props.nativeRows ?? rows} kind="textarea" />;
}
Object.assign(InputGroupInput, { nativeInputSlot: true });
Object.assign(InputGroupTextarea, { nativeInputSlot: true });
