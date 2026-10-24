import { Box, LabelText, Muted, row } from './_core';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './_controls';
import { CodeBlock } from './code-block';
import type { ViewProps } from 'react-native';
export const Trace = Box;
export const TraceItem = Collapsible;
export const TraceTrigger = CollapsibleTrigger;
export const TraceContent = CollapsibleContent;
export const TraceTitle = LabelText;
export const TraceDescription = Muted;
export const TraceIcon = Box;
export const TraceHeader = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const TraceCode = CodeBlock;
export const TraceStatus = ({
  status,
}: {
  status: 'pending' | 'running' | 'complete' | 'error';
}) => <LabelText accessibilityLiveRegion="polite">{status}</LabelText>;
