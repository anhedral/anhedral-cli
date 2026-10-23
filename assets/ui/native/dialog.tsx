import { Modal, View, Pressable, AccessibilityInfo, findNodeHandle } from 'react-native';
import { useRef, type ReactNode } from 'react';
import { Button } from './button';
import { Text } from './text';
import { useTheme } from '../theme';
export function Dialog({ open, onOpenChange, title, description, children, triggerLabel }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children?: ReactNode; triggerLabel: string }) {
  const { colors } = useTheme(); const trigger = useRef<View>(null); const heading = useRef<View>(null);
  function focus(ref: typeof heading) { const node = findNodeHandle(ref.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); }
  return <><View ref={trigger} accessible accessibilityLabel={triggerLabel}><Button onPress={() => onOpenChange(true)}>{triggerLabel}</Button></View><Modal visible={open} transparent animationType="fade" onShow={() => focus(heading)} onDismiss={() => focus(trigger)} onRequestClose={() => onOpenChange(false)}><View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }}><Pressable accessibilityLabel="Close dialog" onPress={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0 }} /><View accessibilityViewIsModal style={{ backgroundColor: colors.popover, padding: 20, borderRadius: 12, gap: 16 }}><View ref={heading} accessible accessibilityRole="header" accessibilityLabel={title}><Text variant="title">{title}</Text></View>{description && <Text variant="muted">{description}</Text>}{children}<Button variant="outline" onPress={() => onOpenChange(false)}>Close</Button></View></View></Modal></>;
}
