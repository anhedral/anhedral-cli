import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, View, Text, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, row, monospace } from './_core';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
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
const CodeContext = createContext({ code: '', language: 'typescript' });
export function CodeBlock({
  code,
  language = 'typescript',
  children,
  style,
  ...props
}: ViewProps & { code: string; language?: string; children?: ReactNode }) {
  return (
    <CodeContext.Provider value={{ code, language }}>
      <Box {...props} style={style}>
        {children ?? <CodeBlockContent />}
      </Box>
    </CodeContext.Provider>
  );
}
export function CodeBlockContent({ style, ...props }: ViewProps) {
  const { code, language } = useContext(CodeContext);
  const { colors } = useTheme();
  const palette = {
    plain: colors.foreground,
    keyword: colors.primary,
    string: colors['chart-2'] ?? colors.primary,
    number: colors['chart-1'] ?? colors.primary,
    comment: colors['muted-foreground'],
    added: colors['chart-2'] ?? colors.primary,
    removed: colors.destructive,
  };
  return (
    <ScrollView horizontal>
      <View
        {...props}
        style={[{ padding: 12, backgroundColor: colors.muted, borderRadius: 8 }, style]}
      >
        <Text
          selectable
          accessibilityLabel={code}
          style={{ fontFamily: monospace, fontSize: 13, lineHeight: 20 }}
        >
          {tokenizeCode(code, language).map((token, index) => (
            <Text
              key={index}
              style={{
                color: palette[token.kind],
                fontWeight: token.kind === 'keyword' ? '600' : '400',
              }}
            >
              {token.text}
            </Text>
          ))}
        </Text>
      </View>
    </ScrollView>
  );
}
export const CodeBlockHeader = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const CodeBlockTitle = LabelText;
export const CodeBlockLanguage = () => <Muted>{useContext(CodeContext).language}</Muted>;
export function CodeBlockCopyButton({
  children = 'Copy code',
  onCopy,
  ...props
}: Omit<ButtonProps, 'children'> & {
  children?: ReactNode;
  onCopy?: (code: string) => void | Promise<void>;
}) {
  const { code } = useContext(CodeContext);
  const [status, setStatus] = useState<'idle' | 'pending' | 'copied' | 'error'>('idle');
  return (
    <>
      <Button
        accessibilityLabel="Copy code"
        {...props}
        disabled={props.disabled || status === 'pending'}
        onPress={async () => {
          setStatus('pending');
          try {
            await (onCopy ? onCopy(code) : (await import('expo-clipboard')).setStringAsync(code));
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
