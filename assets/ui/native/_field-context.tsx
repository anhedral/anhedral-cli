import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  useId,
  useLayoutEffect,
  type ReactNode,
} from 'react';
import { type TextInput } from 'react-native';
import type { InputProps } from './input';
import { plainText } from './_core';
import { composeNativeRefs } from './_slot';

type Part = 'label' | 'description' | 'error';
type RecordPart = { kind: Part; text: string; nativeID: string; targetID?: string };
export type NativeControlSlot = 'input' | 'checkbox' | 'switch' | 'radio-group-item' | 'control';
type ControlProperties = { nativeID?: string; slot: NativeControlSlot; disabled: boolean };
type NativeFieldControl = { focus?: () => void; activate?: () => void };
type FieldState = {
  id: string;
  invalid: boolean;
  disabled: boolean;
  controlPropertiesFor: (id?: string) => ControlProperties | undefined;
  registerControlProperties: (key: string, value: ControlProperties) => () => void;
  label: string;
  labelIDs: string[];
  labelFor: (id?: string) => string;
  labelIDsFor: (id?: string) => string[];
  controls: { current: Map<string, NativeFieldControl> };
  description: string;
  error: string;
  control: { current: { focus?: () => void; activate?: () => void } | null };
  register: (key: string, part: RecordPart) => () => void;
};
const Field = createContext<FieldState | null>(null);
export const useNativeField = () => useContext(Field);
export function NativeFieldProvider({
  id,
  invalid,
  disabled = false,
  children,
}: {
  id: string;
  invalid: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [parts, setParts] = useState<Record<string, RecordPart>>({}),
    control = useRef<NativeFieldControl | null>(null),
    controls = useRef(new Map<string, NativeFieldControl>());
  const [controlProperties, setControlProperties] = useState<Record<string, ControlProperties>>({});
  const registerControlProperties = useCallback((key: string, value: ControlProperties) => {
    setControlProperties((previous) =>
      previous[key]?.nativeID === value.nativeID &&
      previous[key]?.slot === value.slot &&
      previous[key]?.disabled === value.disabled
        ? previous
        : { ...previous, [key]: value },
    );
    return () =>
      setControlProperties((previous) => {
        if (!Object.hasOwn(previous, key)) return previous;
        const next = { ...previous };
        delete next[key];
        return next;
      });
  }, []);
  const register = useCallback((key: string, part: RecordPart) => {
    if (!part.text) return () => {};
    setParts((previous) =>
      previous[key]?.kind === part.kind &&
      previous[key]?.text === part.text &&
      previous[key]?.nativeID === part.nativeID &&
      previous[key]?.targetID === part.targetID
        ? previous
        : { ...previous, [key]: part },
    );
    return () =>
      setParts((previous) => {
        if (!Object.hasOwn(previous, key)) return previous;
        const next = { ...previous };
        delete next[key];
        return next;
      });
  }, []);
  const value = useMemo(() => {
    const all = Object.values(parts),
      text = (kind: Part) =>
        all
          .filter((part) => part.kind === kind)
          .map((part) => part.text)
          .join('. ');
    return {
      id,
      invalid,
      disabled,
      registerControlProperties,
      controlPropertiesFor: (target?: string) => {
        const entries = Object.values(controlProperties);
        return target
          ? entries.find((entry) => entry.nativeID === target)
          : entries.length === 1
            ? entries[0]
            : undefined;
      },
      control,
      register,
      controls,
      labelFor: (target?: string) =>
        all
          .filter(
            (part) =>
              part.kind === 'label' && (part.targetID === undefined || part.targetID === target),
          )
          .map((part) => part.text)
          .join('. '),
      labelIDsFor: (target?: string) =>
        all
          .filter(
            (part) =>
              part.kind === 'label' && (part.targetID === undefined || part.targetID === target),
          )
          .map((part) => part.nativeID),
      label: text('label'),
      labelIDs: all.filter((part) => part.kind === 'label').map((part) => part.nativeID),
      description: text('description'),
      error: text('error'),
    };
  }, [id, invalid, disabled, parts, register, controlProperties, registerControlProperties]);
  return <Field.Provider value={value}>{children}</Field.Provider>;
}
NativeFieldProvider.nativeRegistryTransparent = true;

export function useNativeFieldPart(
  kind: Part,
  children: ReactNode,
  preferredID?: string,
  targetID?: string,
) {
  const field = useNativeField(),
    key = useId(),
    text = plainText(children),
    nativeID = preferredID ?? `${field?.id ?? 'native-field'}-${kind}-${key}`,
    register = field?.register;
  useLayoutEffect(
    () => register?.(key, { kind, text, nativeID, targetID }),
    [register, key, kind, text, nativeID, targetID],
  );
  return { field, nativeID };
}
/** Declarative state stays reactive; native ref registration remains imperative. */
export function useNativeFieldControlProperties(
  slot: NativeControlSlot,
  disabled: boolean,
  nativeID?: string,
) {
  const field = useNativeField(),
    key = useId(),
    register = field?.registerControlProperties;
  useLayoutEffect(
    () => register?.(key, { nativeID, slot, disabled }),
    [register, key, nativeID, slot, disabled],
  );
}
export function useNativeFieldInput(props: InputProps): InputProps {
  useNativeFieldControlProperties(
    'input',
    !!(props.accessibilityState?.disabled ?? (props.editable === false && !props.readOnly)),
    props.nativeID,
  );
  const field = useNativeField(),
    control = field?.control,
    controls = field?.controls;
  const disabled = useRef(
      props.accessibilityState?.disabled ?? (props.editable === false && !props.readOnly),
    ),
    association = useRef<NativeFieldControl | null>(null);
  disabled.current =
    props.accessibilityState?.disabled ?? (props.editable === false && !props.readOnly);
  const assign = useCallback(
    (node: TextInput | null) => {
      const previous = association.current;
      if (!node) {
        if (control?.current === previous) control.current = null;
        if (props.nativeID && controls?.current.get(props.nativeID) === previous)
          controls.current.delete(props.nativeID);
        association.current = null;
        return;
      }
      const entry = {
        focus: () => {
          if (!disabled.current) node.focus();
        },
      };
      association.current = entry;
      if (control) control.current = entry;
      if (props.nativeID) controls?.current.set(props.nativeID, entry);
      return () => {
        if (control?.current === entry) control.current = null;
        if (props.nativeID && controls?.current.get(props.nativeID) === entry)
          controls.current.delete(props.nativeID);
        if (association.current === entry) association.current = null;
      };
    },
    [control, controls, props.nativeID],
  );
  const ref = useMemo(() => composeNativeRefs(props.ref, assign), [props.ref, assign]);
  return {
    ...props,
    ref,
    invalid: props.invalid ?? field?.invalid,
    accessibilityLabel: props.accessibilityLabel ?? (field?.labelFor(props.nativeID) || undefined),
    accessibilityLabelledBy:
      props.accessibilityLabel !== undefined
        ? undefined
        : (props.accessibilityLabelledBy ??
          (field?.labelIDsFor(props.nativeID).length
            ? field.labelIDsFor(props.nativeID)
            : undefined)),
    accessibilityHint:
      props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. '),
  };
}

export type NativeChoiceState = { disabled: boolean; checked: boolean };
export const NativeChoiceLabelContext = createContext<{
  activate: { current: (() => void) | null };
  setState: (value: NativeChoiceState) => void;
} | null>(null);
export function useNativeFieldActivation(
  activate: () => void,
  disabled = false,
  checked = false,
  nativeID?: string,
  slot: NativeControlSlot = 'control',
) {
  useNativeFieldControlProperties(slot, disabled, nativeID);
  const field = useNativeField(),
    choice = useContext(NativeChoiceLabelContext),
    latest = useRef({ activate, disabled });
  latest.current = { activate, disabled };
  const trigger = useCallback(() => {
    if (!latest.current.disabled) latest.current.activate();
  }, []);
  const control = useMemo(() => ({ activate: trigger }), [trigger]),
    target = field?.control,
    controls = field?.controls;
  useLayoutEffect(() => {
    if (target) target.current = control;
    if (nativeID) controls?.current.set(nativeID, control);
    if (choice) choice.activate.current = trigger;
    return () => {
      if (target?.current === control) target.current = null;
      if (nativeID && controls?.current.get(nativeID) === control)
        controls.current.delete(nativeID);
      if (choice?.activate.current === trigger) choice.activate.current = null;
    };
  }, [target, choice, control, trigger, controls, nativeID]);
  useLayoutEffect(() => {
    choice?.setState({ disabled, checked });
  }, [choice, disabled, checked]);
  return !!choice;
}
