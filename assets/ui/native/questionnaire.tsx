import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps, type TextProps, type TextInputProps } from 'react-native';
import { Box, LabelText, Muted, row, plainText, useControllable, nativeComponent } from './_core';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
import { Input } from './input';
import { Checkbox, RadioGroup, RadioGroupItem } from './_controls';
export type Question = {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'multiple' | 'text';
  options?: { value: string; label: string; disabled?: boolean }[];
  optional?: boolean;
  placeholder?: string;
};
export type QuestionnaireAnswers = Record<string, string | string[]>;
function LegacyQuestionnaire({
  questions,
  onComplete,
  defaultAnswers = {},
}: {
  questions: readonly Question[];
  onComplete: (answers: QuestionnaireAnswers) => void;
  defaultAnswers?: QuestionnaireAnswers;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(defaultAnswers);
  const [complete, setComplete] = useState(false);
  const question = questions[index];
  if (!question) return <Muted>No questions</Muted>;
  const answer = answers[question.id];
  const valid =
    question.type === 'multiple'
      ? Array.isArray(answer) && answer.length > 0
      : typeof answer === 'string' && !!answer.trim();
  const update = (next: string | string[]) => {
    setComplete(false);
    setAnswers({ ...answers, [question.id]: next });
  };
  const next = () => {
    if (index === questions.length - 1) {
      if (!complete) {
        setComplete(true);
        onComplete(answers);
      }
    } else setIndex(index + 1);
  };
  return (
    <Box>
      <Muted accessibilityLiveRegion="polite">
        Question {index + 1} of {questions.length}
      </Muted>
      <LabelText accessibilityRole="header">{question.title}</LabelText>
      {question.description && <Muted>{question.description}</Muted>}
      {question.type === 'text' ? (
        <Input
          accessibilityLabel={question.title}
          placeholder={question.placeholder}
          value={typeof answer === 'string' ? answer : ''}
          onChangeText={update}
        />
      ) : question.type === 'single' ? (
        <RadioGroup
          accessibilityLabel={question.title}
          value={typeof answer === 'string' ? answer : ''}
          onValueChange={update}
        >
          {question.options?.map((option) => (
            <RadioGroupItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      ) : (
        <Box>
          {question.options?.map((option) => (
            <Checkbox
              key={option.value}
              disabled={option.disabled}
              accessibilityLabel={option.label}
              checked={Array.isArray(answer) && answer.includes(option.value)}
              onCheckedChange={(checked) => {
                const current = Array.isArray(answer) ? answer : [];
                update(
                  checked
                    ? [...current, option.value]
                    : current.filter((value) => value !== option.value),
                );
              }}
            >
              {option.label}
            </Checkbox>
          ))}
        </Box>
      )}
      <Box style={row()}>
        <Button
          variant="outline"
          disabled={index === 0}
          onPress={() => {
            setComplete(false);
            setIndex(index - 1);
          }}
        >
          Back
        </Button>
        {question.optional && (
          <Button
            variant="ghost"
            disabled={complete}
            onPress={() => {
              const cleared = { ...answers };
              delete cleared[question.id];
              setAnswers(cleared);
              if (index === questions.length - 1) {
                setComplete(true);
                onComplete(cleared);
              } else setIndex(index + 1);
            }}
          >
            Skip
          </Button>
        )}
        <Button disabled={(!valid && !question.optional) || complete} onPress={next}>
          {index === questions.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </Box>
      {complete && <Muted accessibilityLiveRegion="polite">Responses submitted</Muted>}
    </Box>
  );
}

export type QuestionnaireItemDefinition = {
  name: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  invalid?: boolean;
  choices?: readonly { value: string; disabled?: boolean }[];
};
type NativeQuestionnaireProps = ViewProps & {
  items?: readonly QuestionnaireItemDefinition[];
  item?: string;
  defaultItem?: string;
  onItemChange?: (name: string) => void;
  value?: QuestionnaireAnswers;
  defaultAnswers?: QuestionnaireAnswers;
  onValueChange?: (answers: QuestionnaireAnswers) => void;
  onSubmit?: (answers: QuestionnaireAnswers) => void | Promise<void>;
  shortcuts?: 'letters' | 'numbers';
};
type RootState = {
  definitions: readonly QuestionnaireItemDefinition[];
  index: number;
  answers: QuestionnaireAnswers;
  invalid: Set<string>;
  skipped: Set<string>;
  text: Record<string, string>;
  shortcuts: 'letters' | 'numbers';
  pending: boolean;
  submitted: boolean;
  submitError: string;
  change: (name: string, value: string | string[]) => void;
  setText: (name: string, value: string) => void;
  move: (index: number) => void;
  next: () => void;
  skip: () => void;
  submit: () => Promise<void>;
};
const RootContext = createContext<RootState | null>(null);
const ItemContext = createContext<
  | (QuestionnaireItemDefinition & {
      invalid: boolean;
      status: 'unanswered' | 'answered' | 'skipped';
      choiceValues: string[];
    })
  | null
>(null);
const ChoiceContext = createContext<{
  checked: boolean;
  multiple: boolean;
  shortcut: string | null;
} | null>(null);
const hasAnswer = (value: string | string[] | undefined) =>
  Array.isArray(value)
    ? value.some((item) => !!item.trim())
    : typeof value === 'string' && !!value.trim();
function rootState() {
  const state = useContext(RootContext);
  if (!state) throw Error('Questionnaire parts require Questionnaire.');
  return state;
}
function itemState() {
  const state = useContext(ItemContext);
  if (!state) throw Error('Questionnaire item parts require QuestionnaireItem.');
  return state;
}
function collect<T>(
  children: ReactNode,
  type: unknown,
  read: (props: Record<string, unknown>) => T,
): T[] {
  const found: T[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (nativeComponent(child.type) === type) found.push(read(child.props));
    else if (child.props.children) found.push(...collect(child.props.children, type, read));
  });
  return found;
}
export function Questionnaire(
  props: Parameters<typeof LegacyQuestionnaire>[0] | NativeQuestionnaireProps,
) {
  return 'questions' in props ? (
    <LegacyQuestionnaire {...props} />
  ) : (
    <CompoundQuestionnaire {...props} />
  );
}
function CompoundQuestionnaire({
  items,
  item,
  defaultItem,
  onItemChange,
  value,
  defaultAnswers = {},
  onValueChange,
  onSubmit,
  shortcuts = 'letters',
  children,
  ...props
}: NativeQuestionnaireProps) {
  const collected = collect(children, QuestionnaireItem, (p) => ({
    name: String(p.name),
    ...('required' in p ? { required: !!p.required } : {}),
    ...('disabled' in p ? { disabled: !!p.disabled } : {}),
    ...('multiple' in p ? { multiple: !!p.multiple } : {}),
    ...('invalid' in p ? { invalid: !!p.invalid } : {}),
  }));
  const definitions = (items ?? collected)
    .filter((entry) => !entry.disabled)
    .map((entry) => ({ ...entry, ...collected.find((child) => child.name === entry.name) }));
  if (new Set(definitions.map((entry) => entry.name)).size !== definitions.length)
    throw Error('Questionnaire item names must be unique.');
  const [selected, setSelected] = useControllable(
    item,
    defaultItem ?? definitions[0]?.name ?? '',
    onItemChange,
  );
  const [answers, setAnswers] = useControllable(value, defaultAnswers, onValueChange);
  const [invalid, setInvalid] = useState(new Set<string>()),
    [skipped, setSkipped] = useState(new Set<string>()),
    [text, setTextState] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [submitError, setSubmitError] = useState('');
  const submitting = useRef(false);
  const index = Math.max(
    0,
    definitions.findIndex((entry) => entry.name === selected),
  );
  const move = (next: number) => {
    const definition = definitions[next];
    if (definition) setSelected(definition.name);
  };
  const change = (name: string, next: string | string[]) => {
    setAnswers({ ...answers, [name]: next });
    setSubmitted(false);
    setSubmitError('');
    setInvalid((before) => {
      const next = new Set(before);
      next.delete(name);
      return next;
    });
    setSkipped((before) => {
      const next = new Set(before);
      next.delete(name);
      return next;
    });
  };
  const valid = (definition: QuestionnaireItemDefinition, values = answers) =>
    !definition.invalid && (!definition.required || hasAnswer(values[definition.name]));
  const validate = (definition: QuestionnaireItemDefinition) => {
    if (valid(definition)) return true;
    setInvalid((before) => new Set([...before, definition.name]));
    return false;
  };
  const next = () => {
    const current = definitions[index];
    if (current && validate(current)) move(index + 1);
  };
  const skip = () => {
    const current = definitions[index];
    if (!current || current.required || pending) return;
    const next = { ...answers };
    delete next[current.name];
    setAnswers(next);
    setTextState((before) => ({ ...before, [current.name]: '' }));
    setSkipped((before) => new Set([...before, current.name]));
    setSubmitted(false);
    if (index === definitions.length - 1) void submit(next);
    else move(index + 1);
  };
  const submit = async (values = answers) => {
    if (submitting.current || submitted || !definitions.length) return;
    const bad = definitions.findIndex((definition) => !valid(definition, values));
    if (bad >= 0) {
      validate(definitions[bad]!);
      move(bad);
      return;
    }
    submitting.current = true;
    setPending(true);
    setSubmitError('');
    try {
      await onSubmit?.({ ...values });
      setSubmitted(true);
    } catch {
      setSubmitError('Unable to submit. Try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <RootContext.Provider
      value={{
        definitions,
        index,
        answers,
        invalid,
        skipped,
        text,
        shortcuts,
        pending,
        submitted,
        submitError,
        change,
        setText: (name, next) => setTextState((before) => ({ ...before, [name]: next })),
        move,
        next,
        skip,
        submit,
      }}
    >
      <Box {...props}>
        {children}
        {submitError && <LabelText accessibilityRole="alert">{submitError}</LabelText>}
      </Box>
    </RootContext.Provider>
  );
}
export function QuestionnaireItem({
  name,
  required = false,
  multiple = false,
  disabled = false,
  invalid = false,
  onStatusChange,
  children,
  ...props
}: ViewProps & {
  name: string;
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  onStatusChange?: (status: 'unanswered' | 'answered' | 'skipped') => void;
}) {
  const root = rootState();
  const definition = root.definitions.find((entry) => entry.name === name);
  const status = root.skipped.has(name)
    ? 'skipped'
    : hasAnswer(root.answers[name])
      ? 'answered'
      : 'unanswered';
  const callback = useRef(onStatusChange);
  callback.current = onStatusChange;
  const previous = useRef(status);
  useEffect(() => {
    if (previous.current !== status) {
      previous.current = status;
      callback.current?.(status);
    }
  }, [status]);
  const choices = collect(children, QuestionnaireChoice, (p) => String(p.value));
  if (disabled || !definition || root.definitions[root.index]?.name !== name) return null;
  return (
    <ItemContext.Provider
      value={{
        ...definition,
        name,
        required: definition.required ?? required,
        multiple: definition.multiple ?? multiple,
        disabled,
        invalid: invalid || root.invalid.has(name),
        status,
        choiceValues: choices,
      }}
    >
      <Box {...props}>{children}</Box>
    </ItemContext.Provider>
  );
}
export const QuestionnaireTitle = ({ style, ...props }: TextProps) => (
  <LabelText
    accessibilityRole="header"
    {...props}
    style={[{ fontSize: 20, fontWeight: '600' }, style]}
  />
);
export const QuestionnaireDescription = Muted;
export const QuestionnaireChoices = Box;
export const QuestionnaireChoiceDescription = Muted;
export const QuestionnaireChoiceLabel = LabelText;
export function QuestionnaireProgress({ children, ...props }: ViewProps) {
  const root = rootState();
  return (
    <Box {...props} accessibilityLiveRegion="polite">
      {children ?? (
        <Muted>
          Question {root.definitions.length ? root.index + 1 : 0} of {root.definitions.length}
        </Muted>
      )}
    </Box>
  );
}
export function QuestionnaireError({
  children = 'This question requires an answer.',
  ...props
}: TextProps) {
  const item = itemState();
  return item.invalid ? (
    <LabelText {...props} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {children}
    </LabelText>
  ) : null;
}
export function QuestionnaireChoice({
  value,
  checked,
  disabled = false,
  onCheckedChange,
  children,
  onPress,
  ...props
}: ButtonProps & {
  value: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const root = rootState(),
    item = itemState();
  const answer = root.answers[item.name];
  const selected = checked ?? (Array.isArray(answer) ? answer.includes(value) : answer === value);
  const index = item.choiceValues.indexOf(value);
  const shortcut =
    index < 0
      ? null
      : root.shortcuts === 'numbers'
        ? String(index + 1)
        : index < 26
          ? String.fromCharCode(65 + index)
          : null;
  return (
    <ChoiceContext.Provider value={{ checked: selected, multiple: !!item.multiple, shortcut }}>
      <Button
        variant={selected ? 'secondary' : 'outline'}
        {...props}
        disabled={disabled || item.disabled || root.pending}
        accessibilityRole={item.multiple ? 'checkbox' : 'radio'}
        accessibilityLabel={props.accessibilityLabel ?? plainText(children)}
        accessibilityState={{
          checked: selected,
          disabled: disabled || item.disabled || root.pending,
        }}
        onPress={(event) => {
          onPress?.(event);
          if (event.isDefaultPrevented()) return;
          const next = !selected;
          onCheckedChange?.(next);
          if (item.multiple) {
            const before = Array.isArray(answer) ? answer : [];
            root.change(
              item.name,
              next ? [...before, value] : before.filter((entry) => entry !== value),
            );
          } else {
            root.setText(item.name, '');
            root.change(item.name, value);
          }
        }}
      >
        {children}
      </Button>
    </ChoiceContext.Provider>
  );
}
export function QuestionnaireChoiceInput(props: ViewProps) {
  const state = useContext(ChoiceContext);
  const { colors } = useTheme();
  if (!state) throw Error('QuestionnaireChoiceInput requires QuestionnaireChoice.');
  return (
    <View
      {...props}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: 18,
          height: 18,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: state.multiple ? 4 : 9,
          backgroundColor: state.checked ? colors.primary : colors.background,
        },
        props.style,
      ]}
    />
  );
}
export function QuestionnaireChoiceShortcut(props: TextProps) {
  const state = useContext(ChoiceContext);
  return state?.shortcut ? (
    <Muted {...props} accessible={false} accessibilityElementsHidden>
      {state.shortcut}
    </Muted>
  ) : null;
}
export function QuestionnaireInput({ onChangeText, onSubmitEditing, ...props }: TextInputProps) {
  const root = rootState(),
    item = itemState();
  const stored = root.answers[item.name];
  const current =
    root.text[item.name] ??
    (typeof stored === 'string' && !item.choiceValues.includes(stored) ? stored : '');
  return (
    <Input
      {...props}
      editable={props.editable !== false && !item.disabled && !root.pending}
      value={current}
      returnKeyType={root.index === root.definitions.length - 1 ? 'done' : 'next'}
      onChangeText={(next) => {
        onChangeText?.(next);
        if (item.multiple) {
          const existing = Array.isArray(stored) ? stored : [];
          root.change(item.name, [
            ...existing.filter((value) => value !== current),
            ...(next.trim() ? [next] : []),
          ]);
        } else root.change(item.name, next);
        root.setText(item.name, next);
      }}
      onSubmitEditing={(event) => {
        onSubmitEditing?.(event);
        if (event.isDefaultPrevented()) return;
        if (root.index === root.definitions.length - 1) void root.submit();
        else root.next();
      }}
    />
  );
}
export const QuestionnaireActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export function QuestionnairePrevious({
  children = 'Back',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const root = rootState();
  if (root.index === 0) return null;
  return (
    <Button
      variant="outline"
      {...props}
      disabled={props.disabled || root.pending || root.index === 0}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) root.move(root.index - 1);
      }}
    >
      {children}
    </Button>
  );
}
export function QuestionnaireNext({
  children = 'Next',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const root = rootState();
  if (root.index >= root.definitions.length - 1) return null;
  return (
    <Button
      {...props}
      disabled={props.disabled || root.pending}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) root.next();
      }}
    >
      {children}
    </Button>
  );
}
export function QuestionnaireSkip({
  children = 'Skip',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const root = rootState();
  if (root.definitions[root.index]?.required) return null;
  return (
    <Button
      variant="ghost"
      {...props}
      disabled={props.disabled || root.pending}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) root.skip();
      }}
    >
      {children}
    </Button>
  );
}
export function QuestionnaireSubmit({
  children = 'Submit',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const root = rootState();
  if (!root.definitions.length || root.index !== root.definitions.length - 1) return null;
  return (
    <Button
      {...props}
      disabled={props.disabled || root.pending || root.submitted}
      accessibilityState={{
        disabled: !!props.disabled || root.pending || root.submitted,
        busy: root.pending,
      }}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) void root.submit();
      }}
    >
      {children}
    </Button>
  );
}
