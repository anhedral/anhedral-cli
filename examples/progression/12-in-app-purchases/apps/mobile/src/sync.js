import { AppState } from 'react-native';
import { subscribe } from '@workspace/api-client/sync';
import { request } from './session';

export function subscribeToChanges(refresh, signal) {
  return subscribe(request, refresh, signal, (wake) => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') wake();
    });
    return () => listener.remove();
  });
}
