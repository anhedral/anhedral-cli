import { createContext, useContext, type ReactNode } from 'react';
import { Image, type ImageProps, type ViewProps, type TextProps } from 'react-native';
import { Box, LabelText, Muted, row } from './_core';
import { Progress } from './progress';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
export const AttachmentPreview = ({ style, ...props }: ImageProps) => (
  <Image {...props} style={[{ width: 80, height: 80, borderRadius: 6 }, style]} />
);
export const AttachmentName = LabelText;
export const AttachmentMetadata = Muted;
type State = 'idle' | 'uploading' | 'processing' | 'error' | 'done';
type Size = 'default' | 'sm' | 'xs';
const Context = createContext<{ state: State; size: Size }>({ state: 'done', size: 'default' });
export function Attachment({
  name,
  uri,
  progress,
  onRemove,
  onOpen,
  state = 'done',
  size = 'default',
  orientation = 'horizontal',
  children,
  style,
  ...props
}: ViewProps & {
  name?: string;
  uri?: string;
  progress?: number;
  onRemove?: () => void;
  onOpen?: () => void;
  state?: State;
  size?: Size;
  orientation?: 'horizontal' | 'vertical';
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Context.Provider value={{ state, size }}>
      <Box
        {...props}
        accessibilityLiveRegion={state === 'error' ? 'assertive' : 'polite'}
        style={[
          {
            borderWidth: 1,
            borderColor: state === 'error' ? colors.destructive : colors.border,
            borderStyle: state === 'idle' ? 'dashed' : 'solid',
            backgroundColor: colors.card,
            borderRadius: size === 'xs' ? 6 : 10,
            padding: size === 'default' ? 12 : size === 'sm' ? 8 : 4,
            gap: 8,
            minWidth: 0,
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            alignItems: orientation === 'horizontal' ? 'center' : 'flex-start',
          },
          style,
        ]}
      >
        {name !== undefined ? (
          <>
            {uri && <AttachmentPreview source={{ uri }} accessibilityLabel={name} />}
            <AttachmentContent>
              <Button
                variant="ghost"
                onPress={onOpen}
                disabled={!onOpen}
                accessibilityLabel={`Open ${name}`}
              >
                {name}
              </Button>
              {progress !== undefined && (
                <Progress value={progress} accessibilityLabel={`Uploading ${name}`} />
              )}{' '}
              {children}
            </AttachmentContent>
            {onRemove && (
              <AttachmentAction accessibilityLabel={`Remove ${name}`} onPress={onRemove}>
                Remove
              </AttachmentAction>
            )}
          </>
        ) : (
          children
        )}
      </Box>
    </Context.Provider>
  );
}
export function AttachmentMedia({
  variant = 'icon',
  style,
  ...props
}: ViewProps & { variant?: 'icon' | 'image' }) {
  const { colors } = useTheme();
  const { size, state } = useContext(Context);
  const extent = size === 'default' ? 44 : size === 'sm' ? 32 : 24;
  return (
    <Box
      {...props}
      style={[
        {
          width: extent,
          height: extent,
          borderRadius: 6,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'image' ? 'transparent' : colors.muted,
          opacity: state === 'error' ? 0.6 : 1,
        },
        style,
      ]}
    />
  );
}
export const AttachmentContent = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={[{ flex: 1, minWidth: 0, gap: 2 }, style]} />
);
export function AttachmentTitle({ style, ...props }: TextProps) {
  const { size } = useContext(Context);
  return (
    <LabelText
      {...props}
      style={[{ fontWeight: '500', fontSize: size === 'xs' ? 12 : 14 }, style]}
    />
  );
}
export const AttachmentDescription = Muted;
export const AttachmentGroup = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]} />
);
export const AttachmentActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const AttachmentAction = ({
  variant = 'ghost',
  size = 'icon-xs',
  ...props
}: ButtonProps) => <Button variant={variant} size={size} {...props} />;
export const AttachmentTrigger = ({ variant = 'ghost', ...props }: ButtonProps) => (
  <Button variant={variant} {...props} />
);
