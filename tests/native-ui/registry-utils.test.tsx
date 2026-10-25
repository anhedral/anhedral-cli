import { StyleSheet } from 'react-native';
import { nativeStyles } from './.generated';
test('native style composition preserves conditional arrays, registered styles and last-value precedence without mutating inputs', () => {
  const registered = StyleSheet.create({ base: { padding: 8, opacity: 0.5 } }),
    original = { padding: 4 };
  expect(
    nativeStyles(original, [registered.base, false, null, undefined], { padding: 12 }),
  ).toEqual({ padding: 12, opacity: 0.5 });
  expect(original).toEqual({ padding: 4 });
  expect(nativeStyles(false, null, undefined)).toEqual({});
  expect(nativeStyles({ fontWeight: '600' }, { color: 'red' })).toEqual({
    fontWeight: '600',
    color: 'red',
  });
});
