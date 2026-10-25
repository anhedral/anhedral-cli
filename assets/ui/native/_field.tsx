import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewProps,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme';
import { content, nativeComponent, NativeTextStyleContext, LabelText } from './_core';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import { NativePhysicalScope } from './_physical-scope';
import {
  NativeFieldProvider,
  NativeFieldsetDisabled,
  useNativeFieldsetDisabled,
  useNativeField,
  useNativeFieldPart,
  NativeChoiceLabelContext,
  type NativeChoiceState,
} from './_field-context';
import { NativeInputGroupHostBoundary } from './_input-group-context';
import {
  nativePresetFieldStyle,
  type NativeFieldSlot,
  type NativeFieldStyleState,
} from './_preset-field-style';
import { flat, flow, links, itemStyle, TextScope } from './_compound-text';
import { Separator } from './separator';
import { nativePresetLabelStyle } from './_preset-label-style';
type Props = ViewProps & {
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: Record<string, string | number | undefined>;
  ref?: Ref<View>;
  nativePreviousLegend?: boolean;
  nativeLast?: boolean;
  nativeSecondLast?: boolean;
  nativeNestedGroup?: boolean;
  nativeParentStyle?: ViewProps['style'];
};
const Layout = createContext<{
  scope: string;
  width: number;
  orientation: 'vertical' | 'horizontal' | 'responsive';
} | null>(null);
const LabelScope = createContext<{ scope: string } | null>(null);
function useStyle(slot: NativeFieldSlot, extra: Partial<NativeFieldStyleState> = {}) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    source = useNativeRegistrySource(),
    field = useNativeField(),
    layout = useContext(Layout),
    scope = useContext(NativePhysicalScope),
    labelScope = useContext(LabelScope),
    inLabel = labelScope?.scope === scope,
    inherited = StyleSheet.flatten(useContext(NativeTextStyleContext).style);
  const name =
    source === 'default' || source === 'new-york' || source === 'new-york-v4'
      ? source
      : (requested ?? 'nova');
  const label =
    slot === 'FieldLabel'
      ? nativePresetLabelStyle(name, {
          ...theme,
          source: source === 'aria' || source === 'radix' ? source : 'base',
          groupDisabled: field?.disabled,
        })
      : undefined;
  const paint = nativePresetFieldStyle(name, slot, {
    ...theme,
    source,
    invalid: field?.invalid,
    disabled: field?.disabled,
    orientation: layout?.scope === scope ? layout.orientation : 'vertical',
    groupWidth: layout?.scope === scope ? layout.width : 0,
    inLabel,
    fontSize: label?.text.fontSize ?? inherited?.fontSize,
    lineHeight: label?.text.lineHeight ?? inherited?.lineHeight,
    ...extra,
  });
  return {
    ...paint,
    view: { ...label?.view, ...paint.view },
    text: { ...label?.text, ...paint.text },
  };
}
function part(node: ReactNode) {
  if (!isValidElement(node)) return undefined;
  const owner = nativeComponent(node.type);
  return typeof owner === 'function' && 'nativeFieldSlot' in owner
    ? owner.nativeFieldSlot
    : undefined;
}
type ErrorProps = { children?: ReactNode; errors?: ({ message?: string } | undefined)[] };
function errorState({ children, errors }: ErrorProps) {
  const unique = [...new Map(errors?.map((error) => [error?.message, error]) ?? []).values()];
  return {
    unique,
    shown: !!children || (unique.length === 1 ? !!unique[0]?.message : unique.length > 1),
    message:
      children ||
      (unique.length === 1
        ? unique[0]?.message
        : unique
            .filter((error) => error?.message)
            .map((error) => error!.message)
            .join('\n')),
  };
}
function childrenWithLayout(children: ReactNode, paint: ReturnType<typeof useStyle>) {
  const nodes = flat(children).filter(
    (node) =>
      part(node) !== 'FieldError' ||
      !isValidElement<ErrorProps>(node) ||
      errorState(node.props).shown,
  );
  return nodes.map((node, index) => {
    if (!isValidElement<Props>(node)) return node;
    const slot = part(node),
      ownStyle = StyleSheet.flatten(node.props.style),
      childStyle = {
        ...(paint.childrenFull
          ? { width: '100%' as const }
          : paint.childrenAuto
            ? { width: 'auto' as const }
            : {}),
        ...(paint.choiceOffset && ['checkbox', 'radio-group-item'].includes(String(slot))
          ? { marginTop: 1 }
          : {}),
        ...(slot === 'FieldLabel' && paint.labelFlex
          ? { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' as const }
          : {}),
        ...(slot === 'Field' && paint.childPadding !== undefined
          ? { padding: paint.childPadding }
          : {}),
        ...(slot === 'FieldGroup' && paint.nestedGap !== undefined ? { gap: paint.nestedGap } : {}),
      };
    return cloneElement(node, {
      ...(typeof slot === 'string' && slot.startsWith('Field')
        ? {
            nativePreviousLegend:
              index > 0 &&
              part(nodes[index - 1]) === 'FieldLegend' &&
              (!isValidElement<{ variant?: string }>(nodes[index - 1]) ||
                ((nodes[index - 1] as ReactElement<{ variant?: string }>).props.variant ??
                  'legend') === 'legend'),
            nativeLast: index === nodes.length - 1,
            nativeSecondLast: index === nodes.length - 2,
          }
        : {}),
      style: [childStyle, ownStyle],
    });
  });
}
function Container({
  slot,
  children,
  style,
  textStyle,
  nativeTextPaint,
  nativePreviousLegend = false,
  nativeLast = false,
  nativeSecondLast = false,
  nativeNestedGroup: _,
  nativeParentStyle: __,
  ...props
}: Props & { slot: NativeFieldSlot }) {
  const paint = useStyle(slot, {
    previousLegend: nativePreviousLegend,
    last: nativeLast,
    secondLast: nativeSecondLast,
    choiceGroup:
      slot === 'FieldSet' &&
      flat(children).some(
        (node) => part(node) === 'radio-group' || part(node) === 'checkbox-group',
      ),
  });
  return (
    <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
      <View {...props} style={itemStyle(paint.view, style)}>
        <NativeInputGroupHostBoundary>
          {slot === 'FieldDescription'
            ? flow(paint.links ? links(children) : children)
            : slot === 'FieldTitle'
              ? flow(children)
              : content(childrenWithLayout(children, paint))}
        </NativeInputGroupHostBoundary>
      </View>
    </TextScope>
  );
}
export function Field({
  invalid = false,
  disabled: ownDisabled,
  orientation = 'vertical',
  children,
  style,
  textStyle,
  nativeTextPaint,
  nativePreviousLegend: _,
  nativeLast: __,
  nativeSecondLast: ___,
  ...props
}: Props & {
  invalid?: boolean;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'responsive';
}) {
  const inheritedField = useNativeField(),
    disabled = !!ownDisabled || !!inheritedField?.disabled;
  const id = useId(),
    scope = useContext(NativePhysicalScope),
    parent = useContext(Layout),
    width = parent?.scope === scope ? parent.width : 0,
    hasContent = flat(children).some((node) => part(node) === 'FieldContent');
  const paint = useStyle('Field', {
    invalid,
    disabled,
    orientation,
    groupWidth: width,
    hasContent,
  });
  return (
    <NativeFieldProvider id={id} invalid={invalid} disabled={disabled}>
      <Layout.Provider value={{ scope, width, orientation }}>
        <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
          <View role="group" {...props} style={itemStyle(paint.view, style)}>
            <NativeInputGroupHostBoundary>
              {content(childrenWithLayout(children, paint))}
            </NativeInputGroupHostBoundary>
          </View>
        </TextScope>
      </Layout.Provider>
    </NativeFieldProvider>
  );
}
export function FieldGroup({ children, onLayout, ...props }: Props) {
  const scope = useContext(NativePhysicalScope),
    [width, setWidth] = useState(0);
  return (
    <Layout.Provider value={{ scope, width, orientation: 'vertical' }}>
      <Container
        slot="FieldGroup"
        {...props}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
          onLayout?.(event);
        }}
      >
        {children}
      </Container>
    </Layout.Provider>
  );
}
export function FieldSet({
  invalid = false,
  disabled = false,
  children,
  ...props
}: Props & { invalid?: boolean; disabled?: boolean }) {
  const id = useId(),
    scope = useContext(NativePhysicalScope),
    parentDisabled = useNativeFieldsetDisabled(),
    blocked = disabled || parentDisabled;
  return (
    <NativeFieldsetDisabled.Provider value={{ scope, disabled: blocked }}>
      <NativeFieldProvider id={id} invalid={invalid} disabled={blocked}>
        <Container slot="FieldSet" role="group" {...props}>
          {children}
        </Container>
      </NativeFieldProvider>
    </NativeFieldsetDisabled.Provider>
  );
}
export function FieldContent(props: Props) {
  return <Container slot="FieldContent" {...props} />;
}
function ChoiceTitle(props: Props) {
  const { nativeID } = useNativeFieldPart('label', props.children, props.nativeID);
  return <Container slot="FieldTitle" {...props} nativeID={nativeID} />;
}
export function FieldTitle(props: Props) {
  const owner = useContext(LabelScope),
    scope = useContext(NativePhysicalScope),
    choice = owner?.scope === scope;
  return choice ? <ChoiceTitle {...props} /> : <Container slot="FieldTitle" {...props} />;
}
export function FieldLegend({
  variant = 'legend',
  nativePreviousLegend: _,
  nativeLast: __,
  nativeSecondLast: ___,
  children,
  style,
  textStyle,
  nativeTextPaint,
  ...props
}: Props & { variant?: 'legend' | 'label' }) {
  const { nativeID } = useNativeFieldPart('label', children, props.nativeID),
    paint = useStyle('FieldLegend', { legendVariant: variant });
  return (
    <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
      <View {...props} nativeID={nativeID} style={itemStyle(paint.view, style)}>
        {flow(children)}
      </View>
    </TextScope>
  );
}
export function FieldLabel({
  controlID,
  children,
  onPress,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  style,
  textStyle,
  nativeTextPaint,
  nativePreviousLegend: _,
  nativeLast: __,
  nativeSecondLast: ___,
  ...props
}: Omit<Props, 'style'> &
  Pick<PressableProps, 'onHoverIn' | 'onHoverOut'> & {
    style?: Props['style'];
    controlID?: string;
    onPress?: PressableProps['onPress'];
  }) {
  const scope = useContext(NativePhysicalScope);
  const compound = flat(children).some((node) => part(node) === 'Field'),
    { field, nativeID } = useNativeFieldPart(
      'label',
      compound ? '' : children,
      props.nativeID,
      controlID,
    ),
    activate = useRef<(() => void) | null>(null),
    [state, setState] = useState<NativeChoiceState>({ disabled: false, checked: false }),
    choice = useMemo(() => ({ activate, setState, scope }), [scope]),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const paint = useStyle('FieldLabel', {
    controlID,
    compound,
    checked: state.checked,
    selected: state.checked,
    disabled: state.disabled || field?.disabled,
    hovered,
    focused,
  });
  return (
    <NativeChoiceLabelContext.Provider value={choice}>
      <LabelScope.Provider value={{ scope }}>
        <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
          <Pressable
            {...props}
            nativeID={nativeID}
            accessible={false}
            disabled={state.disabled || field?.disabled}
            onHoverIn={(event) => {
              setHovered(true);
              onHoverIn?.(event);
            }}
            onHoverOut={(event) => {
              setHovered(false);
              onHoverOut?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onPress={(event) => {
              onPress?.(event);
              if (event.isDefaultPrevented()) return;
              if (compound) activate.current?.();
              else {
                const control = controlID
                  ? field?.controls.current.get(controlID)
                  : field?.control.current;
                if (control?.activate) control.activate();
                else control?.focus?.();
              }
            }}
            style={itemStyle(paint.view, style)}
          >
            <NativeInputGroupHostBoundary>
              {compound ? content(childrenWithLayout(children, paint)) : flow(children)}
            </NativeInputGroupHostBoundary>
          </Pressable>
        </TextScope>
      </LabelScope.Provider>
    </NativeChoiceLabelContext.Provider>
  );
}
export function FieldDescription({ children, ...props }: Props) {
  const { nativeID } = useNativeFieldPart('description', children, props.nativeID);
  return (
    <Container slot="FieldDescription" {...props} nativeID={nativeID}>
      {children}
    </Container>
  );
}
export function FieldError({
  children,
  errors,
  ...props
}: Props & { errors?: ({ message?: string } | undefined)[] }) {
  const { unique, message, shown } = errorState({ children, errors }),
    { nativeID } = useNativeFieldPart('error', message, props.nativeID),
    paint = useStyle('FieldErrorList');
  if (!shown) return null;
  const body =
    children ||
    (unique.length === 1 ? (
      unique[0]?.message
    ) : (
      <View style={paint.view}>
        {unique.map((error, index) =>
          error?.message ? <LabelText key={index}>{'• ' + error.message}</LabelText> : null,
        )}
      </View>
    ));
  return (
    <Container
      slot="FieldError"
      accessible={true}
      role="alert"
      accessibilityLiveRegion="polite"
      {...props}
      nativeID={nativeID}
    >
      {body}
    </Container>
  );
}
export function FieldSeparator({ children, style, textStyle, nativeTextPaint, ...props }: Props) {
  const paint = useStyle('FieldSeparator'),
    line = useStyle('FieldSeparatorLine'),
    label = useStyle('FieldSeparatorContent');
  return (
    <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
      <View {...props} style={itemStyle(paint.view, style)}>
        <Separator decorative style={line.view} />
        {!!children && (
          <TextScope paint={label}>
            <View style={label.view}>{flow(children)}</View>
          </TextScope>
        )}
      </View>
    </TextScope>
  );
}
for (const [slot, component] of Object.entries({
  Field,
  FieldGroup,
  FieldSet,
  FieldContent,
  FieldTitle,
  FieldLegend,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSeparator,
}))
  Object.assign(component, {
    nativeFieldSlot: slot,
    nativeContainerTextSlot: true,
    nativeTextPaintSlot: true,
  });
