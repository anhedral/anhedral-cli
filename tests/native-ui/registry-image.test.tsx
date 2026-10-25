import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet, Platform } from 'react-native';
import { ThemeProvider } from './.generated';
import { RegistryImage } from './.generated/src/native/registry-styles';
import { NativeRegistryImage } from './.generated/src/native/registry-image';
const source = 'https://example.test/photo.jpg';
const bitmap = () => screen.getByTestId('photo-bitmap', { includeHiddenElements: true });
const loaded = { nativeEvent: { source: { width: 800, height: 400, url: source } } };
const failed = { nativeEvent: { error: 'offline' } };
test('native source image keeps authored dimensions, alt text and crop; exposes loading until the actual bitmap arrives', async () => {
  const onLoad = jest.fn();
  await render(
    <ThemeProvider>
      <RegistryImage
        src={source}
        alt="Authored photo"
        testID="photo"
        width={800}
        height={400}
        className="rounded-lg object-contain"
        onLoad={onLoad}
      />
    </ThemeProvider>,
  );
  expect(screen.getByRole('progressbar', { name: 'Loading Authored photo' })).toBeTruthy();
  expect(bitmap().props.source).toEqual({ uri: source });
  expect(bitmap().props.resizeMode).toBe('contain');
  expect(StyleSheet.flatten(screen.getByTestId('photo').props.style)).toMatchObject({
    width: 800,
    height: 400,
    overflow: 'hidden',
  });
  expect(screen.queryByRole('image')).toBeNull();
  await fireEvent(bitmap(), 'load', loaded);
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('image', { name: 'Authored photo' })).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});
test('native source image composes grayscale and brightness in one SVG matrix and waits for both native renderers', async () => {
  await render(
    <ThemeProvider>
      <RegistryImage
        src={source}
        alt="Filtered photo"
        testID="photo"
        fill
        className="w-full h-full object-cover grayscale brightness-[0.2]"
      />
    </ThemeProvider>,
  );
  const tree = JSON.stringify(screen.toJSON());
  if (Platform.OS === 'android')
    expect(screen.getByTestId('photo-native-filter')).toHaveStyle({
      filter: [{ grayscale: 1 }, { brightness: 0.2 }],
    });
  else {
    expect(tree).toContain('0.04252');
    expect(tree).toContain('0.14304');
  }
  expect(StyleSheet.flatten(screen.getByTestId('photo').props.style)).toMatchObject({
    position: 'absolute',
    width: '100%',
    height: '100%',
  });
  await fireEvent(bitmap(), 'load', loaded);
  if (Platform.OS !== 'android') {
    expect(screen.queryByRole('image', { name: 'Filtered photo' })).toBeNull();
    await fireEvent(
      screen.getAllByTestId('photo-svg-source', { includeHiddenElements: true })[0]!,
      'load',
      loaded,
    );
  } else
    expect(screen.queryByTestId('photo-svg-source', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByRole('image', { name: 'Filtered photo' })).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});
test('image failure is visible and retries the same authored URL; callbacks from a replaced source do not update it', async () => {
  const onError = jest.fn(),
    onLoad = jest.fn();
  const view = await render(
    <ThemeProvider>
      <RegistryImage src={source} alt="First" testID="photo" onError={onError} onLoad={onLoad} />
    </ThemeProvider>,
  );
  const oldLoad = bitmap().props.onLoad,
    oldError = bitmap().props.onError;
  await fireEvent(bitmap(), 'error', failed);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load First');
  await fireEvent.press(screen.getByRole('button', { name: 'Retry image' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(bitmap().props.source).toEqual({ uri: source });
  await act(() => {
    oldLoad(loaded);
    oldError(failed);
  });
  expect(onLoad).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledTimes(1);
  await view.rerender(
    <ThemeProvider>
      <RegistryImage
        src="https://example.test/second.jpg"
        alt="Second"
        testID="photo"
        onError={onError}
        onLoad={onLoad}
      />
    </ThemeProvider>,
  );
  await act(() => {
    oldLoad(loaded);
    oldError(failed);
  });
  expect(screen.getByRole('progressbar', { name: 'Loading Second' })).toBeTruthy();
  await fireEvent(bitmap(), 'load', loaded);
  expect(onLoad).toHaveBeenCalledTimes(1);
});
test('filtered native image readiness uses Android bitmap completion or the iOS SVG deadline', async () => {
  jest.useFakeTimers();
  try {
    await render(
      <ThemeProvider>
        <RegistryImage src={source} alt="Slow" testID="photo" grayscale />
      </ThemeProvider>,
    );
    await fireEvent(bitmap(), 'load', loaded);
    await act(() => jest.advanceTimersByTime(30_000));
    if (Platform.OS === 'android') {
      expect(screen.getByRole('image', { name: 'Slow' })).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    } else {
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load Slow');
      await fireEvent.press(screen.getByRole('button', { name: 'Retry image' }));
      await fireEvent(bitmap(), 'load', loaded);
      await fireEvent(
        screen.getAllByTestId('photo-svg-source', { includeHiddenElements: true })[0]!,
        'load',
        loaded,
      );
      await act(() => jest.advanceTimersByTime(30_000));
      expect(screen.queryByRole('alert')).toBeNull();
    }
  } finally {
    jest.useRealTimers();
  }
});
test('decorative native images stay outside accessibility even after loading; fill stretches without cropping', async () => {
  await render(
    <ThemeProvider>
      <RegistryImage src={source} alt="" testID="photo" className="object-fill" />
    </ThemeProvider>,
  );
  await fireEvent(bitmap(), 'load', loaded);
  expect(screen.queryByRole('image')).toBeNull();
  expect(bitmap().props.resizeMode).toBe('stretch');
});
test('unported local sources and invalid image filters fail explicitly', () => {
  expect(() => NativeRegistryImage({ src: '/unreviewed.png', alt: 'local' })).toThrow(
    'explicitly ported local asset',
  );
  expect(() => NativeRegistryImage({ src: source, alt: 'invalid', brightness: NaN })).toThrow(
    'finite nonnegative',
  );
});
