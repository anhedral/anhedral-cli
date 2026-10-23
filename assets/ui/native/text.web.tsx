import type { TextProps } from './text';
const classes = { heading: 'text-2xl font-semibold tracking-tight', title: 'text-base font-medium leading-snug', body: 'text-sm leading-5', muted: 'text-sm leading-5 text-muted-foreground', caption: 'text-xs text-muted-foreground', label: 'text-sm font-medium' };
export function Text({ variant = 'body', children, accessibilityRole, accessibilityLiveRegion, testID }: TextProps) {
  const Tag = accessibilityRole === 'header' ? 'h1' : 'p';
  return <Tag className={classes[variant]} aria-live={accessibilityLiveRegion === 'assertive' ? 'assertive' : accessibilityLiveRegion === 'polite' ? 'polite' : undefined} data-testid={testID}>{children}</Tag>;
}
