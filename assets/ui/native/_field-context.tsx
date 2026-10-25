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
type RecordPart = { kind: Part; text: string; nativeID: string };
type FieldState = {
  id: string;
  invalid: boolean;
  label: string;
  labelIDs: string[];
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
    control = useRef<{ focus?: () => void; activate?: () => void } | null>(null);
  const register = useCallback((key: string, part: RecordPart) => {
    if (!part.text) return () => {};
    setParts((previous) =>
      previous[key]?.kind === part.kind &&
      previous[key]?.text === part.text &&
      previous[key]?.nativeID === part.nativeID
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
      label: text('label'),
      labelIDs: all.filter((part) => part.kind === 'label').map((part) => part.nativeID),
      description: text('description'),
      error: text('error'),
    };
  }, [id, invalid, parts, register]);
  return <Field.Provider value={value}>{children}</Field.Provider>;
}
export function useNativeFieldPart(kind: Part, children: ReactNode, preferredID?: string) {
  const field = useNativeField(),
    key = useId(),
    text = plainText(children),
    nativeID = preferredID ?? `${field?.id ?? 'native-field'}-${kind}-${key}`,
    register = field?.register;
  useLayoutEffect(
    () => register?.(key, { kind, text, nativeID }),
    [register, key, kind, text, nativeID],
  );
  return { field, nativeID };
}
export function useNativeFieldInput(props: InputProps): InputProps {
  const field = useNativeField(),
    control = field?.control;
  const assign = useCallback(
    (node: TextInput | null) => {
      if (control) control.current = node;
      if (node)
        return () => {
          if (control?.current === node) control.current = null;
        };
    },
    [control],
  );
  const ref = useMemo(() => composeNativeRefs(props.ref, assign), [props.ref, assign]);
  return {
    ...props,
    ref,
    invalid: props.invalid ?? field?.invalid,
    accessibilityLabel: props.accessibilityLabel ?? (field?.label || undefined),
    accessibilityLabelledBy:
      props.accessibilityLabel !== undefined
        ? undefined
        : (props.accessibilityLabelledBy ?? (field?.labelIDs.length ? field.labelIDs : undefined)),
    accessibilityHint:
      props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. '),
  };
}

export type NativeChoiceState = { disabled: boolean; checked: boolean };
export const NativeChoiceLabelContext = createContext<{
  activate: { current: (() => void) | null };
  setState: (value: NativeChoiceState) => void;
} | null>(null);
export function useNativeFieldActivation(activate: () => void, disabled = false, checked = false) {
  const field = useNativeField(),
    choice = useContext(NativeChoiceLabelContext),
    latest = useRef({ activate, disabled });
  latest.current = { activate, disabled };
  const trigger = useCallback(() => {
    if (!latest.current.disabled) latest.current.activate();
  }, []);
  const control = useMemo(() => ({ activate: trigger }), [trigger]),
    target = field?.control;
  useLayoutEffect(() => {
    if (target) target.current = control;
    if (choice) choice.activate.current = trigger;
    return () => {
      if (target?.current === control) target.current = null;
      if (choice?.activate.current === trigger) choice.activate.current = null;
    };
  }, [target, choice, control, trigger]);
  useLayoutEffect(() => {
    choice?.setState({ disabled, checked });
  }, [choice, disabled, checked]);
  return !!choice;
}
