import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  type ReactNode,
  type RefObject,
} from 'react';
import type { TextInput, StyleProp, TextStyle, ViewStyle } from 'react-native';
export type NativeInputGroupAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
export type NativeInputGroupMetadata = {
  kind: 'input' | 'textarea' | 'button' | 'addon';
  disabled?: boolean;
  invalid?: boolean;
  focused?: boolean;
  control?: boolean;
  height?: number;
  ref?: RefObject<TextInput | null>;
  align?: NativeInputGroupAlign;
  direct?: boolean;
};
export type NativeInputGroupOwner = {
  disabled: boolean;
  invalid: boolean;
  hasInvalid: boolean;
  hasInput: boolean;
  hasTextarea: boolean;
  hasTextareaAny: boolean;
  focused: boolean;
  focusWithin: boolean;
  hasDisabled: boolean;
  inlineStart: boolean;
  inlineEnd: boolean;
  blockStart: boolean;
  blockEnd: boolean;
  blockStartAny: boolean;
  blockEndAny: boolean;
  vertical: boolean;
  controls: ReadonlyMap<string, NativeInputGroupMetadata>;
  update: (id: string, value: NativeInputGroupMetadata) => void;
  remove: (id: string) => void;
};
export const NativeInputGroupContext = createContext<NativeInputGroupOwner | null>(null);
export const NativeInputGroupDirectChild = createContext(true);
export const NativeInputGroupSurface = createContext<{
  inCombobox?: boolean;
  borderColor?: string;
}>({});
export const NativeInputGroupAddonContext = createContext<{
  update: (id: string, kind: 'button' | 'kbd') => void;
  remove: (id: string) => void;
} | null>(null);
type KbdPaint = StyleProp<ViewStyle & TextStyle>;
export const NativeInputGroupKbdPaint = createContext<{ direct?: KbdPaint; descendant?: KbdPaint }>(
  {},
);
/** Registered native slots replace disabled/invalid/focus DOM descendant selectors. */
export function useNativeInputGroupMetadata(value: NativeInputGroupMetadata) {
  const owner = useContext(NativeInputGroupContext),
    direct = useContext(NativeInputGroupDirectChild),
    id = useId(),
    update = owner?.update,
    remove = owner?.remove;
  useLayoutEffect(() => {
    update?.(id, { ...value, direct });
  }, [
    update,
    id,
    direct,
    value.kind,
    value.disabled,
    value.invalid,
    value.focused,
    value.control,
    value.height,
    value.ref,
    value.align,
  ]);
  useLayoutEffect(
    () => () => {
      remove?.(id);
    },
    [remove, id],
  );
}
/** Transparent React owners preserve direct-child identity; real native hosts close it. */
export function useNativeInputGroupAddonPresence(kind: 'button' | 'kbd', active = true) {
  const owner = useContext(NativeInputGroupAddonContext),
    id = useId(),
    update = owner?.update,
    remove = owner?.remove;
  useLayoutEffect(() => {
    if (active) update?.(id, kind);
    else remove?.(id);
  }, [id, kind, active, update, remove]);
  useLayoutEffect(
    () => () => {
      remove?.(id);
    },
    [id, remove],
  );
}
export function NativeInputGroupHostBoundary({ children }: { children?: ReactNode }) {
  const paint = useContext(NativeInputGroupKbdPaint),
    next = useMemo(() => ({ descendant: paint.descendant }), [paint.descendant]);
  return (
    <NativeInputGroupDirectChild.Provider value={false}>
      <NativeInputGroupAddonContext.Provider value={null}>
        <NativeInputGroupKbdPaint.Provider value={next}>
          {children}
        </NativeInputGroupKbdPaint.Provider>
      </NativeInputGroupAddonContext.Provider>
    </NativeInputGroupDirectChild.Provider>
  );
}
