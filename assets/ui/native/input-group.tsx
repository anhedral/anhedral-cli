import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type RefObject,
} from 'react';
import { Pressable, TextInput, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, content, nativeComponent } from './_core';
import { Input, type InputProps } from './input';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
import { composeNativeRefs } from './_slot';
import { useNativeField } from './_field-context';
type Align = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
type Group = {
  input: RefObject<TextInput | null>;
  disabled: boolean;
  setDisabled: (value: boolean) => void;
  invalid: boolean;
  setInvalid: (value: boolean) => void;
};
const Context = createContext<Group | null>(null);
function useGroup() {
  const group = useContext(Context);
  if (!group) throw Error('Input group parts require InputGroup.');
  return group;
}
export function InputGroup({
  children,
  style,
  disabled = false,
  invalid = false,
  ...props
}: ViewProps & { disabled?: boolean; invalid?: boolean }) {
  const input = useRef<TextInput>(null),
    [controlDisabled, setDisabled] = useState(false),
    [controlInvalid, setInvalid] = useState(false),
    { colors, radius } = useTheme();
  const nodes = Children.toArray(children),
    addons = (align: Align) =>
      nodes.filter(
        (node) =>
          isValidElement<{ align?: Align }>(node) &&
          nativeComponent(node.type) === InputGroupAddon &&
          (node.props.align ?? 'inline-start') === align,
      ),
    controls = nodes.filter(
      (node) => !isValidElement(node) || nativeComponent(node.type) !== InputGroupAddon,
    );
  return (
    <Context.Provider
      value={{
        input,
        disabled: disabled || controlDisabled,
        setDisabled,
        invalid: invalid || controlInvalid,
        setInvalid,
      }}
    >
      <Box
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: invalid || controlInvalid ? colors.destructive : colors.input,
            borderRadius: radius,
            backgroundColor: colors.background,
            gap: 0,
            opacity: disabled || controlDisabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {addons('block-start')}
        <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
          {addons('inline-start')}
          {content(controls)}
          {addons('inline-end')}
        </Box>
        {addons('block-end')}
      </Box>
    </Context.Provider>
  );
}
export function InputGroupAddon({
  align = 'inline-start',
  style,
  children,
  ...props
}: ViewProps & { align?: Align }) {
  const group = useGroup();
  return (
    <Pressable
      {...props}
      accessible={false}
      onPress={() => {
        if (!group.disabled) group.input.current?.focus();
      }}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8 },
        align === 'inline-start'
          ? { paddingStart: 8, paddingVertical: 6 }
          : align === 'inline-end'
            ? { paddingEnd: 8, paddingVertical: 6 }
            : align === 'block-start'
              ? { paddingHorizontal: 10, paddingTop: 8 }
              : { paddingHorizontal: 10, paddingBottom: 8 },
        style,
      ]}
    >
      {content(children)}
    </Pressable>
  );
}
export const InputGroupText = Muted;
type GroupButtonProps = Omit<ButtonProps, 'size' | 'children'> & {
  size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
  children?: ReactNode;
} & (
    { type?: 'button' } | { type: 'submit' | 'reset'; onPress: NonNullable<ButtonProps['onPress']> }
  );
/** Native forms bind submit/reset explicitly through onPress. */
export function InputGroupButton({
  size = 'xs',
  variant = 'ghost',
  type = 'button',
  children,
  ...props
}: GroupButtonProps) {
  const group = useGroup();
  if (type !== 'button' && !props.onPress)
    throw Error('Native submit/reset buttons require onPress.');
  return (
    <Button
      nativePreset={false}
      {...props}
      variant={variant}
      size={size}
      disabled={group.disabled || props.disabled}
    >
      {Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <LabelText style={{ fontSize: 14, fontWeight: '500' }}>{child}</LabelText>
        ) : (
          child
        ),
      )}
    </Button>
  );
}
export function InputGroupInput({
  ref,
  style,
  invalid: ownInvalid,
  editable,
  onChangeText,
  ...props
}: InputProps) {
  const field = useNativeField();
  const invalid = ownInvalid ?? field?.invalid;
  const group = useGroup(),
    setInvalid = group.setInvalid,
    setDisabled = group.setDisabled;
  const mergedRef = useMemo(() => composeNativeRefs(group.input, ref), [group.input, ref]);
  useEffect(() => {
    setInvalid(!!invalid);
  }, [invalid, setInvalid]);
  useEffect(() => {
    setDisabled(editable === false);
  }, [editable, setDisabled]);
  return (
    <Input
      {...props}
      editable={!group.disabled && editable !== false}
      invalid={invalid}
      onChangeText={onChangeText}
      ref={mergedRef}
      style={[
        { flex: 1, minWidth: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
        style,
      ]}
    />
  );
}
export function InputGroupTextarea(props: InputProps) {
  return (
    <InputGroupInput
      {...props}
      multiline
      textAlignVertical="top"
      style={[{ minHeight: 100 }, props.style]}
    />
  );
}
