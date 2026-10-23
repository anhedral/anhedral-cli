import { Button } from '../web/button';
import { useTheme } from '../theme';
export function ThemeSwitcher() { const { preference, setPreference } = useTheme(); return <div className="flex items-center gap-1" role="group" aria-label="Appearance">{(['system', 'light', 'dark'] as const).map((value) => <Button key={value} variant={preference === value ? 'secondary' : 'ghost'} aria-pressed={preference === value} onClick={() => setPreference(value)}>{value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}</Button>)}</div>; }
