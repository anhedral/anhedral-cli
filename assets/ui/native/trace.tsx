import { createContext, useContext } from 'react';
import { Box, LabelText, Muted, row } from './_core';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './_controls';
import { CodeBlock } from './code-block';
import { useTheme } from '../theme';
import type { ViewProps, TextProps } from 'react-native';
type Status = 'pending' | 'running' | 'complete' | 'error';
const StatusContext = createContext<Status | undefined>(undefined);
export const Trace = Box;
export const TraceItem = Collapsible;
export const TraceTrigger = CollapsibleTrigger;
export const TraceContent = CollapsibleContent;
export const TraceCollapsible = Collapsible;
export const TraceCollapsibleTrigger = CollapsibleTrigger;
export const TraceCollapsibleContent = CollapsibleContent;
export function TraceLine({ status, style, ...props }: ViewProps & { status?: Status }) {
  return (
    <StatusContext.Provider value={status}>
      <Box
        {...props}
        accessibilityLiveRegion={status === 'running' ? 'polite' : undefined}
        style={row([{ opacity: status === 'pending' ? 0.6 : 1 }, style])}
      />
    </StatusContext.Provider>
  );
}
export function TraceTitle({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  const status = useContext(StatusContext);
  return (
    <LabelText
      {...props}
      style={[
        { color: status === 'error' ? colors.destructive : colors['muted-foreground'] },
        style,
      ]}
    />
  );
}
export const TraceDescription = Muted;
export const TraceIcon = ({ style, ...props }: ViewProps) => (
  <Box
    {...props}
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[{ flexShrink: 0 }, style]}
  />
);
export const TraceHeader = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const TraceCode = CodeBlock;
export const TraceStatus = ({ status }: { status: Status }) => (
  <LabelText accessibilityLiveRegion="polite">{status}</LabelText>
);
