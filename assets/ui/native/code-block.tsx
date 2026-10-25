import {
  Children,
  cloneElement,
  isValidElement,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView, View, Text, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, row, monospace, nativeComponent } from './_core';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
import { useNativeFontStyle } from './fonts';
export type CodeToken = {
  text: string;
  kind: 'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'added' | 'removed';
};
/** Small offline lexer; preserves every source byte. It never executes supplied code. */
export function tokenizeCode(code: string, language = 'typescript'): CodeToken[] {
  if (language === 'diff' || language === 'patch')
    return code.split(/(?<=\n)/).map((text) => ({
      text,
      kind:
        text.startsWith('+') && !text.startsWith('+++')
          ? 'added'
          : text.startsWith('-') && !text.startsWith('---')
            ? 'removed'
            : text.startsWith('@@')
              ? 'keyword'
              : 'plain',
    }));
  const tokens: CodeToken[] = [];
  const pattern =
    /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(?:const|let|var|function|return|if|else|for|while|class|interface|type|export|import|from|async|await|new|throw|try|catch|true|false|null|undefined|def|in|and|or|not|None|True|False|select|from|where|SELECT|FROM|WHERE)\b|\b\d+(?:\.\d+)?\b/g;
  let position = 0;
  for (const match of code.matchAll(pattern)) {
    if (match.index > position)
      tokens.push({ text: code.slice(position, match.index), kind: 'plain' });
    const text = match[0];
    const kind = /^(?:\/\/|\/\*|#)/.test(text)
      ? 'comment'
      : /^["'`]/.test(text)
        ? 'string'
        : /^\d/.test(text)
          ? 'number'
          : 'keyword';
    tokens.push({ text, kind });
    position = match.index + text.length;
  }
  if (position < code.length) tokens.push({ text: code.slice(position), kind: 'plain' });
  return tokens;
}
const CodeContext = createContext<{ code: string; language: string; size: 'default' | 'sm' }>({
  code: '',
  language: 'typescript',
  size: 'default',
});
export function CodeBlock({
  code = '',
  language = 'typescript',
  size = 'default',
  variant = 'default',
  children,
  style,
  ...props
}: ViewProps & {
  code?: string;
  language?: string;
  size?: 'default' | 'sm';
  variant?: 'default' | 'destructive';
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <CodeContext.Provider value={{ code, language, size }}>
      <Box
        {...props}
        style={[
          {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: variant === 'destructive' ? colors.destructive : colors.border,
            backgroundColor: colors.muted,
          },
          style,
        ]}
      >
        {children ?? <CodeBlockContent />}
      </Box>
    </CodeContext.Provider>
  );
}
export function CodeBlockContent({
  style,
  children,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  ...props
}: ViewProps & { wrap?: boolean; lineNumbers?: boolean; startLine?: number }) {
  const { code, language, size } = useContext(CodeContext);
  const normal = useNativeFontStyle('mono'),
    strong = useNativeFontStyle('mono', 600);
  const fontFamily = normal.fontFamily ?? monospace;
  const { colors } = useTheme();
  const source = typeof children === 'string' ? children : code;
  const palette = {
    plain: colors.foreground,
    keyword: colors.primary,
    string: colors['chart-2'] ?? colors.primary,
    number: colors['chart-1'] ?? colors.primary,
    comment: colors['muted-foreground'],
    added: colors['chart-2'] ?? colors.primary,
    removed: colors.destructive,
  };
  const start = Number.isFinite(startLine) ? Math.trunc(startLine) : 1;
  const tokens = (value: string) =>
    tokenizeCode(value, language).map((token, index) => (
      <Text
        key={index}
        style={[
          { color: palette[token.kind], fontWeight: token.kind === 'keyword' ? '600' : '400' },
          token.kind === 'keyword' ? strong : normal,
        ]}
      >
        {token.text}
      </Text>
    ));
  const customLines = Children.toArray(children).some(
    (child) => isValidElement(child) && nativeComponent(child.type) === CodeBlockLine,
  );
  return (
    <ScrollView horizontal={!wrap} contentContainerStyle={wrap ? { flexGrow: 1 } : undefined}>
      <View
        {...props}
        style={[
          { padding: size === 'sm' ? 8 : 12, backgroundColor: colors.muted, borderRadius: 8 },
          style,
        ]}
      >
        {lineNumbers && (children === undefined || typeof children === 'string') ? (
          source
            .replace(/\n$/, '')
            .split('\n')
            .map((line, index) => (
              <CodeBlockLine key={index} lineNumber={start + index}>
                {tokens(line)}
              </CodeBlockLine>
            ))
        ) : customLines ? (
          Children.map(children, (child, index) =>
            isValidElement<{ lineNumber?: number }>(child) &&
            nativeComponent(child.type) === CodeBlockLine
              ? cloneElement(child, { lineNumber: lineNumbers ? start + index : undefined })
              : child,
          )
        ) : (
          <Text
            selectable
            accessibilityLabel={source || undefined}
            style={{ fontFamily, fontSize: size === 'sm' ? 12 : 13, lineHeight: 20 }}
          >
            {children === undefined || typeof children === 'string' ? tokens(source) : children}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
export function CodeBlockLine({
  variant = 'default',
  lineNumber,
  children,
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'added' | 'removed' | 'highlighted'; lineNumber?: number }) {
  const { colors } = useTheme();
  const fontFamily = useNativeFontStyle('mono').fontFamily ?? monospace;
  const empty =
    children === undefined ||
    children === null ||
    children === '' ||
    (Array.isArray(children) && children.length === 0);
  return (
    <Box
      {...props}
      style={[
        {
          flexDirection: 'row',
          gap: 12,
          minHeight: 20,
          backgroundColor:
            variant === 'removed'
              ? colors.destructive
              : variant === 'added'
                ? colors.secondary
                : variant === 'highlighted'
                  ? colors.accent
                  : 'transparent',
        },
        style,
      ]}
    >
      {lineNumber !== undefined && (
        <Muted
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ fontFamily, minWidth: 28, textAlign: 'right' }}
        >
          {lineNumber}
        </Muted>
      )}
      <Text
        selectable
        style={{
          fontFamily,
          fontSize: 13,
          lineHeight: 20,
          color:
            variant === 'removed'
              ? (colors['destructive-foreground'] ?? colors['primary-foreground'])
              : colors.foreground,
        }}
      >
        {empty ? '\n' : children}
      </Text>
    </Box>
  );
}
export const CodeBlockActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row([{ marginStart: 'auto' }, style])} />
);
export const CodeBlockFooter = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const CodeBlockHeader = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const CodeBlockTitle = LabelText;
export const CodeBlockLanguage = () => <Muted>{useContext(CodeContext).language}</Muted>;
export function CodeBlockCopyButton({
  children = 'Copy code',
  onCopy,
  value,
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & {
  children?: ReactNode;
  onCopy?: (code: string) => void | Promise<void>;
  value?: string;
}) {
  const { code } = useContext(CodeContext);
  const [status, setStatus] = useState<'idle' | 'pending' | 'copied' | 'error'>('idle');
  return (
    <>
      <Button
        accessibilityLabel="Copy code"
        {...props}
        disabled={props.disabled || status === 'pending'}
        onPress={async (event) => {
          onPress?.(event);
          if (event.isDefaultPrevented()) return;
          setStatus('pending');
          try {
            await (onCopy
              ? onCopy(value ?? code)
              : (await import('expo-clipboard')).setStringAsync(value ?? code));
            setStatus('copied');
          } catch {
            setStatus('error');
          }
        }}
      >
        {children}
      </Button>
      {status === 'copied' && <Muted accessibilityLiveRegion="polite">Copied</Muted>}
      {status === 'error' && <Muted accessibilityRole="alert">Copy failed. Try again.</Muted>}
    </>
  );
}
