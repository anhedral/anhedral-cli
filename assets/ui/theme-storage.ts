import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
const key = 'anhedral-theme';
export async function readPreference() {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}
export async function savePreference(value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* Preferences remain usable without storage. */
  }
}
export function applyTheme(mode: 'light' | 'dark', background: string, preference: string) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : mode);
  void SystemUI.setBackgroundColorAsync(background).catch(() => {});
}
export function subscribePreference(_listener: (value: unknown) => void) {
  return () => {};
}
