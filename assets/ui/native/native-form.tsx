import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { View, AccessibilityInfo, type ViewProps } from 'react-native';
import { LabelText, content } from './_core';
import { useTheme } from '../theme';

type Action = () => void | Promise<void>;
type Entry = { id: string; pending: boolean; submit: Action; reset: Action };
function createScope() {
  const entries = new Map<string, Entry>(),
    listeners = new Set<() => void>();
  let revision = 0;
  return {
    entries,
    snapshot: () => revision,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: () => {
      revision++;
      for (const listener of listeners) listener();
    },
  };
}
const Scope = createContext<ReturnType<typeof createScope> | null>(null);
const NearestForm = createContext<Entry | null>(null);
const noSubscription = () => () => {};
const noSnapshot = () => 0;
export function NativeFormScope({ children }: { children?: ReactNode }) {
  const [scope] = useState(createScope);
  return <Scope.Provider value={scope}>{children}</Scope.Provider>;
}
export function useNativeFormAction(form?: string) {
  const scope = useContext(Scope),
    nearest = useContext(NearestForm);
  useSyncExternalStore(
    scope?.subscribe ?? noSubscription,
    scope?.snapshot ?? noSnapshot,
    noSnapshot,
  );
  const entry = form === undefined ? nearest : scope?.entries.get(form);
  const resolve = () => {
    const current = form === undefined ? nearest : scope?.entries.get(form);
    if (!current)
      throw Error(
        form
          ? `Native form "${form}" is not registered in this screen's NativeFormScope.`
          : 'Native submit/reset buttons require NativeForm or an explicit action.',
      );
    return current;
  };
  return {
    available: !!entry,
    pending: entry?.pending ?? false,
    submit: () => resolve().submit(),
    reset: () => resolve().reset(),
  };
}
export type NativeFormProps = ViewProps & {
  onSubmit: Action;
  onReset?: Action;
  onError?: (error: unknown) => void;
};
/** Each screen gets its own association scope; HTML form IDs never become a global native registry. */
export function NativeForm(props: NativeFormProps) {
  const scope = useContext(Scope);
  return scope ? (
    <FormBody {...props} />
  ) : (
    <NativeFormScope>
      <FormBody {...props} />
    </NativeFormScope>
  );
}
function FormBody({
  nativeID,
  children,
  onSubmit,
  onReset,
  onError,
  accessibilityState,
  ...props
}: NativeFormProps) {
  const scope = useContext(Scope)!;
  useSyncExternalStore(scope.subscribe, scope.snapshot, scope.snapshot);
  const generated = useId(),
    id = nativeID ?? `native-form-${generated}`;
  const callbacks = useRef({ onSubmit, onReset, onError });
  callbacks.current = { onSubmit, onReset, onError };
  const mounted = useRef(false),
    entry = useRef<Entry | null>(null),
    running = useRef<Promise<void> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null),
    { colors } = useTheme();
  const perform = (kind: 'submit' | 'reset'): Promise<void> => {
    const current = entry.current!;
    if (current.pending) return running.current ?? Promise.resolve();
    current.pending = true;
    scope.publish();
    setError(null);
    const work = (async () => {
      try {
        const action = kind === 'submit' ? callbacks.current.onSubmit : callbacks.current.onReset;
        if (!action) throw Error('Native reset requires an explicit onReset callback.');
        await action();
      } catch (reason) {
        if (mounted.current) {
          const message =
            reason instanceof Error ? reason.message : 'Unable to complete the form action.';
          setError(message);
          AccessibilityInfo.announceForAccessibility(message);
          try {
            callbacks.current.onError?.(reason);
          } catch (reportFailure) {
            setError(
              message +
                '\n' +
                (reportFailure instanceof Error
                  ? reportFailure.message
                  : 'Unable to report the form error.'),
            );
          }
        }
      } finally {
        current.pending = false;
        if (scope.entries.get(current.id) === current) scope.publish();
      }
    })();
    running.current = work;
    return work;
  };
  entry.current ??= {
    id,
    pending: false,
    submit: () => perform('submit'),
    reset: () => perform('reset'),
  };
  // Keep callbacks current without unregistering a live form when controlled inputs render.
  entry.current.submit = () => perform('submit');
  entry.current.reset = () => perform('reset');
  useLayoutEffect(() => {
    const current = entry.current!;
    if (scope.entries.has(id))
      throw Error(`Duplicate native form ID "${id}" in one NativeFormScope.`);
    current.id = id;
    scope.entries.set(id, current);
    mounted.current = true;
    scope.publish();
    return () => {
      mounted.current = false;
      if (scope.entries.get(id) === current) {
        scope.entries.delete(id);
        scope.publish();
      }
    };
  }, [scope, id]);
  return (
    <NearestForm.Provider value={entry.current}>
      <View
        {...props}
        nativeID={id}
        accessibilityState={{
          ...accessibilityState,
          busy: !!accessibilityState?.busy || entry.current.pending,
        }}
      >
        {content(children)}
        {error && (
          <LabelText
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={{ color: colors.destructive }}
          >
            {error}
          </LabelText>
        )}
      </View>
    </NearestForm.Provider>
  );
}
