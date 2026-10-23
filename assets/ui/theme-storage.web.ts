const key = 'anhedral-theme';
export async function readPreference() { try { return localStorage.getItem(key); } catch { return null; } }
export async function savePreference(value: string) { try { localStorage.setItem(key, value); } catch { /* Preferences remain usable without storage. */ } }
export function applyTheme(mode: string, background: string, _preference?: string) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.style.colorScheme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
}
export function subscribePreference(listener: (value: unknown) => void) {
  const handle = (event: StorageEvent) => { if (event.key === key) listener(event.newValue ?? 'system'); };
  window.addEventListener('storage', handle);
  return () => window.removeEventListener('storage', handle);
}
