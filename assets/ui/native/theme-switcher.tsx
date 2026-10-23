import { Stack } from './layout';
import { Button } from './button';
import { Text } from './text';
import { useTheme } from '../theme';
export function ThemeSwitcher() { const { preference, setPreference } = useTheme(); return <Stack><Text variant="label">Appearance</Text>{(['system', 'light', 'dark'] as const).map((value) => <Button key={value} variant={preference === value ? 'secondary' : 'ghost'} accessibilityState={{ selected: preference === value }} onPress={() => setPreference(value)}>{value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}</Button>)}</Stack>; }
