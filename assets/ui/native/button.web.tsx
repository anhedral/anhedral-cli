import { Button as NovaButton } from '../web/button';
import type { ButtonProps } from './button';
/** Universal event/label adapter; Nova owns the browser primitive and all its styling. */
export function Button({ children, variant = 'default', size = 'default', disabled, accessibilityLabel, onPress, testID, accessibilityState }: ButtonProps) {
  return <NovaButton variant={variant} size={size} disabled={disabled ?? false} aria-label={accessibilityLabel} aria-pressed={accessibilityState?.selected} data-testid={testID} onClick={(event) => onPress?.(event as never)}>{children}</NovaButton>;
}
