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
type NativeFieldControl = { focus?: () => void; activate?: () => void };
type FieldState = {
  id: string;
  invalid: boolean;
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
  children,
}: {
  id: string;
  invalid: boolean;
  children?: ReactNode;
}) {
  const [parts, setParts] = useState<Record<string, RecordPart>>({}),
    control = useRef<NativeFieldControl | null>(null),
    controls = useRef(new Map<string, NativeFieldControl>());
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
  }, [id, invalid, parts, register]);
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
export function useNativeFieldInput(props: InputProps): InputProps {
  const field = useNativeField(),
    control = field?.control,
    controls = field?.controls;
  const editable = useRef(props.editable),
    association = useRef<NativeFieldControl | null>(null);
  editable.current = props.editable;
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
          if (editable.current !== false) node.focus();
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
) {
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
