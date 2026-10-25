import { useEffect, useRef, useState, useMemo, type Ref } from 'react';
import {
  View,
  AccessibilityInfo,
  type ViewProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useNativeInputAppearance } from './_input-appearance';
import { composeNativeRefs } from './_slot';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Button } from './button';
import { LabelText } from './_core';
import { useNativeFieldActivation, useNativeField } from './_field-context';
import { useNativeFormConstraint } from './native-form';
/** Native assets retain real device/cache URIs; no browser fake paths or upload is implied. */
export type NativePickedDocument = Readonly<Omit<DocumentPickerAsset, 'file' | 'base64'>>;
export type FileInputProps = Omit<ViewProps, 'children' | 'style'> & {
  ref?: Ref<View>;
  style?: StyleProp<TextStyle>;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  accept?: string;
  files?: readonly NativePickedDocument[];
  defaultFiles?: readonly NativePickedDocument[];
  onFilesChange?: (files: readonly NativePickedDocument[]) => void;
  onPickerCancel?: () => void;
  onError?: (error: unknown) => void;
};
const mimeByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};
export function nativeDocumentTypes(accept?: string): string[] {
  if (!accept?.trim()) return ['*/*'];
  const result = accept.split(',').map((value) => {
    const token = value.trim().toLowerCase();
    if (Object.hasOwn(mimeByExtension, token)) return mimeByExtension[token]!;
    if (/^(?:\*|[a-z0-9!#$&^_.+-]+)\/(?:\*|[a-z0-9!#$&^_.+-]+)$/.test(token)) return token;
    throw Error('Unreviewed native document type: ' + token);
  });
  return [...new Set(result)];
}
export function FileInput({
  ref,
  disabled = false,
  required = false,
  multiple = false,
  accept,
  files,
  defaultFiles = [],
  onFilesChange,
  onPickerCancel,
  onError,
  style,
  invalid,
  onFocus,
  onBlur,
  ...props
}: FileInputProps) {
  const [local, setLocal] = useState<readonly NativePickedDocument[]>(defaultFiles),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string>();
  const current = files ?? local,
    active = useRef(false),
    generation = useRef(0),
    busy = useRef(false),
    blocked = useRef(disabled),
    button = useRef<View>(null);
  blocked.current = disabled;
  const field = useNativeField();
  const [focused, setFocused] = useState(false);
  const appearance = useNativeInputAppearance(
    'input',
    style,
    focused,
    invalid ?? field?.invalid,
    disabled,
  );
  const mergedRef = useMemo(() => composeNativeRefs(ref, button), [ref]);
  const types = nativeDocumentTypes(accept);
  const configuration = JSON.stringify([multiple, [...types].sort()]);
  const currentConfiguration = useRef(configuration),
    callbacks = useRef({ onFilesChange, onPickerCancel, onError });
  currentConfiguration.current = configuration;
  callbacks.current = { onFilesChange, onPickerCancel, onError };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      generation.current++;
    };
  }, []);
  async function choose() {
    if (blocked.current || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    const request = ++generation.current,
      configurationAtOpen = currentConfiguration.current;
    try {
      const picker = await import('expo-document-picker');
      const result = await picker.getDocumentAsync({
        type: types,
        multiple,
        copyToCacheDirectory: true,
      });
      if (
        !active.current ||
        request !== generation.current ||
        blocked.current ||
        currentConfiguration.current !== configurationAtOpen
      )
        return;
      if (result.canceled) {
        callbacks.current.onPickerCancel?.();
        return;
      }
      const selected = result.assets.map(({ uri, name, mimeType, size, lastModified }) => ({
        uri,
        name,
        mimeType,
        size,
        lastModified,
      }));
      if (
        !selected.length ||
        selected.some(
          (file) =>
            typeof file.uri !== 'string' ||
            !file.uri ||
            typeof file.name !== 'string' ||
            !file.name ||
            !Number.isFinite(file.lastModified) ||
            (file.size !== undefined && (!Number.isFinite(file.size) || file.size < 0)),
        )
      )
        throw Error('The native document provider returned an invalid asset.');
      if (!multiple && selected.length > 1)
        throw Error(
          'The native document provider returned multiple assets for a single-file control.',
        );
      setLocal(selected);
      callbacks.current.onFilesChange?.(selected);
      AccessibilityInfo.announceForAccessibility(selected.map((file) => file.name).join(', '));
    } catch (error) {
      if (
        active.current &&
        request === generation.current &&
        !blocked.current &&
        currentConfiguration.current === configurationAtOpen
      ) {
        setError('Could not choose a file. Try again.');
        AccessibilityInfo.announceForAccessibility('Could not choose a file. Try again.');
        callbacks.current.onError?.(error);
      }
    } finally {
      busy.current = false;
      if (active.current && request === generation.current) setPending(false);
    }
  }
  useNativeFieldActivation(
    () => {
      void choose();
    },
    disabled,
    false,
    props.nativeID,
  );
  useNativeFormConstraint(
    () => {
      if (disabled || !required || current.length) return;
      const message = 'Choose a file.';
      return message;
    },
    () => button.current?.focus(),
  );
  const fileTypeface = Object.fromEntries(
    Object.entries(appearance.ownText).filter(
      ([key, value]) =>
        value !== undefined &&
        ['fontFamily', 'fontStyle', 'letterSpacing', 'textTransform'].includes(key),
    ),
  );
  return (
    <Button
      {...props}
      ref={mergedRef}
      nativePreset={false}
      type="button"
      variant="outline"
      disabled={disabled}
      pending={pending}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onPress={() => {
        void choose();
      }}
      accessibilityLabel={
        props.accessibilityLabel ??
        (field?.labelFor(props.nativeID) || (multiple ? 'Choose files' : 'Choose file'))
      }
      accessibilityValue={{
        ...props.accessibilityValue,
        text:
          props.accessibilityValue?.text ??
          (current.length
            ? current.map((file) => file.name).join(', ')
            : multiple
              ? 'No files chosen'
              : 'No file chosen'),
      }}
      accessibilityHint={
        [
          props.accessibilityHint,
          field?.description,
          field?.error,
          (invalid ?? field?.invalid) ? 'Invalid value' : undefined,
          required ? 'Required' : undefined,
        ]
          .filter(Boolean)
          .join('. ') || undefined
      }
      style={[
        { alignItems: 'stretch', flexDirection: 'column', justifyContent: 'center', gap: 4 },
        ...appearance.frame.slice(0, -1),
        error && { height: undefined, minHeight: Number(appearance.adapted?.view.height ?? 44) },
        appearance.frame.at(-1),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
        <View style={[{ justifyContent: 'center' }, appearance.adapted?.file.view]}>
          <LabelText
            fontRole={appearance.fontRole}
            style={[
              { fontSize: 14, fontWeight: '500' },
              fileTypeface,
              appearance.adapted?.file.text,
            ]}
          >
            {pending ? 'Opening files…' : multiple ? 'Choose files' : 'Choose file'}
          </LabelText>
        </View>
        <LabelText
          fontRole={appearance.fontRole}
          numberOfLines={1}
          style={[...appearance.text, { flex: 1, minWidth: 0 }]}
        >
          {current.length
            ? current.map((file) => file.name).join(', ')
            : multiple
              ? 'No files chosen'
              : 'No file chosen'}
        </LabelText>
      </View>
      {error ? <LabelText accessibilityRole="alert">{error}</LabelText> : null}
    </Button>
  );
}

Object.assign(FileInput, { nativeInputSlot: true });
