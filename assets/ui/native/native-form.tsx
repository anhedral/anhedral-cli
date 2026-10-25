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
type Constraint = { validate: () => string | undefined; focus: () => void };
type Entry = {
  id: string;
  pending: boolean;
  submit: Action;
  reset: Action;
  controls: Map<string, Constraint>;
};
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
/** Constraint registration is scoped to the owning form, including dynamic field cleanup. */
export function useNativeFormConstraint(
  validate: Constraint['validate'],
  focus: Constraint['focus'],
) {
  const owner = useContext(NearestForm),
    id = useId(),
    current = useRef({ validate, focus });
  current.current = { validate, focus };
  useLayoutEffect(() => {
    if (!owner) return;
    owner.controls.set(id, {
      validate: () => current.current.validate(),
      focus: () => current.current.focus(),
    });
    return () => {
      owner.controls.delete(id);
    };
  }, [owner, id]);
}
export type NativeFormProps = ViewProps & {
  onSubmit: Action;
  noValidate?: boolean;
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
  noValidate = false,
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
        if (kind === 'submit' && !noValidate)
          for (const control of current.controls.values()) {
            const invalid = control.validate();
            if (invalid) {
              control.focus();
              throw Error(invalid);
            }
          }
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
    controls: new Map(),
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

/** Browser examples without an action retain an explicit application-integration boundary. */
export function NativeRecipeForm({
  onSubmit,
  ...props
}: Omit<NativeFormProps, 'onSubmit'> & { onSubmit?: Action }) {
  return (
    <NativeForm
      accessibilityHint={onSubmit ? undefined : 'Example form. No submission action is configured.'}
      {...props}
      onSubmit={
        onSubmit ??
        (() => {
          throw Error('This example has no submission action configured.');
        })
      }
    />
  );
}
