import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as Picker from 'expo-document-picker';
import * as UI from './.generated';
import { nativeDocumentTypes } from './.generated/src/native/file-input';
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
const pick = jest.mocked(Picker.getDocumentAsync);
const file = {
  uri: 'file:///native-qa/one.txt',
  name: 'one.txt',
  size: 12,
  mimeType: 'text/plain',
  lastModified: 1,
};
const frame = (children: React.ReactNode) => <UI.ThemeProvider>{children}</UI.ThemeProvider>;
beforeEach(() => jest.clearAllMocks());
test('file selection returns real native asset metadata, retains readable cache URIs and does not submit a form', async () => {
  pick.mockResolvedValue({ canceled: false, assets: [file] });
  const change = jest.fn(),
    submit = jest.fn();
  await render(
    frame(
      <UI.NativeForm onSubmit={submit}>
        <UI.FileInput onFilesChange={change} />
      </UI.NativeForm>,
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(pick).toHaveBeenCalledWith({ type: ['*/*'], multiple: false, copyToCacheDirectory: true });
  expect(change).toHaveBeenCalledWith([file]);
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
});
test('cancel retains previously chosen work and controlled selection remains owned by the caller', async () => {
  pick.mockResolvedValue({ canceled: true, assets: null });
  const change = jest.fn(),
    cancel = jest.fn();
  await render(
    frame(<UI.FileInput files={[file]} onFilesChange={change} onPickerCancel={cancel} />),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(change).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
});
test('multiple native assets retain all names and MIME restrictions', async () => {
  const second = {
    ...file,
    name: 'two.pdf',
    uri: 'file:///native-qa/two.pdf',
    mimeType: 'application/pdf',
  };
  pick.mockResolvedValue({ canceled: false, assets: [file, second] });
  await render(frame(<UI.FileInput multiple accept="text/plain,.pdf" />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose files' }));
  expect(pick).toHaveBeenCalledWith(
    expect.objectContaining({ type: ['text/plain', 'application/pdf'], multiple: true }),
  );
  expect(screen.getByText('one.txt, two.pdf')).toBeOnTheScreen();
});
test('disabled controls never launch a system picker and pending activation is deduplicated', async () => {
  let resolve!: (value: Picker.DocumentPickerResult) => void;
  pick.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = await render(frame(<UI.FileInput disabled />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(pick).not.toHaveBeenCalled();
  await view.rerender(frame(<UI.FileInput />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(pick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Choose file' })).toBeDisabled();
  await act(() => resolve({ canceled: true, assets: null }));
  expect(screen.getByRole('button', { name: 'Choose file' })).not.toBeDisabled();
});
test('unmounted or newly disabled fields ignore stale native picker results', async () => {
  let resolve!: (value: Picker.DocumentPickerResult) => void;
  pick.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const change = jest.fn(),
    view = await render(frame(<UI.FileInput onFilesChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  await view.unmount();
  await act(() => resolve({ canceled: false, assets: [file] }));
  expect(change).not.toHaveBeenCalled();
  const disabled = await render(frame(<UI.FileInput onFilesChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  await disabled.rerender(frame(<UI.FileInput disabled onFilesChange={change} />));
  await act(() => resolve({ canceled: false, assets: [file] }));
  expect(change).not.toHaveBeenCalled();
});
test('provider errors and malformed assets expose a retryable native error without losing prior work', async () => {
  const error = jest.fn();
  pick.mockRejectedValueOnce(Error('Provider unavailable'));
  await render(frame(<UI.FileInput defaultFiles={[file]} onError={error} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(error).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not choose a file. Try again.');
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
  pick.mockResolvedValueOnce({ canceled: false, assets: [{ ...file, uri: '' }] });
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(error).toHaveBeenCalledTimes(2);
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
});
test('required files participate in native form constraints and field labels activate their scoped picker', async () => {
  pick.mockResolvedValue({ canceled: false, assets: [file] });
  const submit = jest.fn();
  await render(
    frame(
      <UI.NativeForm onSubmit={submit}>
        <UI.Field>
          <UI.Label controlID="document">Document</UI.Label>
          <UI.FileInput nativeID="document" required />
        </UI.Field>
        <UI.Button type="submit">Save</UI.Button>
      </UI.NativeForm>,
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a file.');
  await fireEvent.press(screen.getByText('Document'));
  expect(pick).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
});
test('native accept translation normalizes known extensions and MIME types and rejects unreviewed specifications', () => {
  expect(nativeDocumentTypes()).toEqual(['*/*']);
  expect(nativeDocumentTypes('image/jpeg, .PNG,image/jpeg')).toEqual(['image/jpeg', 'image/png']);
  expect(() => nativeDocumentTypes('application')).toThrow('Unreviewed native document type');
});

test('malformed empty selections and extra assets in a single-file response preserve previous selections', async () => {
  const error = jest.fn();
  pick.mockResolvedValueOnce({ canceled: false, assets: [] });
  await render(frame(<UI.FileInput defaultFiles={[file]} onError={error} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(error).toHaveBeenCalledTimes(1);
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
  pick.mockResolvedValueOnce({ canceled: false, assets: [file, { ...file, name: 'two.txt' }] });
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  expect(error).toHaveBeenCalledTimes(2);
  expect(screen.getByText('one.txt')).toBeOnTheScreen();
  expect(() => nativeDocumentTypes('__proto__')).toThrow('Unreviewed native document type');
});

test('picker callbacks follow the latest application owner and changed selection modes discard stale results', async () => {
  let resolve!: (value: Picker.DocumentPickerResult) => void;
  pick.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const previous = jest.fn(),
    latest = jest.fn(),
    view = await render(frame(<UI.FileInput onFilesChange={previous} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  await view.rerender(frame(<UI.FileInput onFilesChange={latest} />));
  await act(() => resolve({ canceled: false, assets: [file] }));
  expect(previous).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledWith([file]);
  expect(screen.getByRole('button', { name: 'Choose file' }).props.accessibilityValue.text).toBe(
    'one.txt',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
  await view.rerender(frame(<UI.FileInput multiple onFilesChange={latest} />));
  await act(() => resolve({ canceled: false, assets: [file] }));
  expect(latest).toHaveBeenCalledTimes(1);
});

test('file selector inherits explicit root typeface while retaining its separate source typography', async () => {
  await render(
    frame(
      <UI.NativeComponentStyleProvider style="nova">
        <UI.FileInput
          style={{ fontFamily: 'Courier', fontStyle: 'italic', fontSize: 23, letterSpacing: 1.5 }}
        />
      </UI.NativeComponentStyleProvider>,
    ),
  );
  expect(screen.getByText('Choose file')).toHaveStyle({
    fontFamily: 'Courier',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.5,
  });
  expect(screen.getByText('No file chosen')).toHaveStyle({ fontFamily: 'Courier', fontSize: 23 });
});
