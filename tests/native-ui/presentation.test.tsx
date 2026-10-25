import React from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test('card, item, empty and message primitives safely render raw native text and headers', async () => {
  await mount(
    <>
      <UI.Card>
        <UI.CardTitle>Title</UI.CardTitle>
        <UI.CardContent>Body</UI.CardContent>
      </UI.Card>
      <UI.Item>
        <UI.ItemTitle>Item title</UI.ItemTitle>
        <UI.ItemDescription>Detail</UI.ItemDescription>
      </UI.Item>
      <UI.Empty>
        <UI.EmptyTitle>Empty</UI.EmptyTitle>
      </UI.Empty>
      <UI.Message from="user">
        <UI.MessageContent>Hello</UI.MessageContent>
      </UI.Message>
    </>,
  );
  expect(screen.getByRole('header', { name: 'Title' })).toBeOnTheScreen();
  for (const text of ['Body', 'Detail', 'Empty', 'Hello'])
    expect(screen.getByText(text)).toBeOnTheScreen();
});
test('aspect ratio rejects invalid geometry and respects explicit dimensions', async () => {
  const result = await mount(<UI.AspectRatio testID="ratio" ratio={0} />);
  expect(screen.getByTestId('ratio')).toHaveStyle({ aspectRatio: 1 });
  await result.rerender(
    <UI.ThemeProvider>
      <UI.AspectRatio testID="ratio" ratio={16 / 9} />
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('ratio')).toHaveStyle({ aspectRatio: 16 / 9 });
});
test('badge, bubble, markers and typography use native semantic theme colours', async () => {
  await mount(
    <>
      <UI.Badge variant="outline" testID="badge">
        Tag
      </UI.Badge>
      <UI.Bubble side="end" testID="bubble">
        Message
      </UI.Bubble>
      <UI.Marker>
        <UI.MarkerContent>System note</UI.MarkerContent>
      </UI.Marker>
      <UI.TypographyBlockquote>Quote</UI.TypographyBlockquote>
      <UI.TypographyInlineCode>Code</UI.TypographyInlineCode>
      <UI.Kbd>⌘ K</UI.Kbd>
    </>,
  );
  expect(screen.getByTestId('badge')).toHaveStyle({ backgroundColor: 'transparent' });
  expect(screen.getByTestId('bubble')).toHaveStyle({ alignSelf: 'flex-end' });
  expect(screen.getByText('System note')).toBeOnTheScreen();
  expect(screen.getByText('Quote')).toHaveStyle({ fontStyle: 'italic' });
});
test('structural separator supports both orientations without becoming a touch control', async () => {
  const result = await mount(<UI.Separator testID="separator" />);
  expect(screen.getByTestId('separator', { includeHiddenElements: true })).toHaveStyle({
    height: 1,
  });
  await result.rerender(
    <UI.ThemeProvider>
      <UI.Separator testID="separator" orientation="vertical" decorative={false} />
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('separator')).toHaveStyle({ width: 1 });
  expect(screen.queryByRole('button')).toBeNull();
});
test('drawer provides an accessible dismissal action on its drag handle', async () => {
  await mount(
    <UI.Drawer defaultOpen>
      <UI.DrawerContent>
        <UI.DrawerTitle>Drawer</UI.DrawerTitle>
      </UI.DrawerContent>
    </UI.Drawer>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Close drawer' }));
  expect(screen.queryByText('Drawer')).toBeNull();
});
test('copy failures remain retryable and do not escape as rejected UI promises', async () => {
  const copy = jest
    .fn()
    .mockRejectedValueOnce(Error('Clipboard unavailable'))
    .mockResolvedValueOnce(undefined);
  await mount(
    <UI.CodeBlock code="const value = 1;">
      <UI.CodeBlockCopyButton onCopy={copy} />
    </UI.CodeBlock>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Copy code' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Copy failed/);
  await userEvent.press(screen.getByRole('button', { name: 'Copy code' }));
  expect(screen.getByText('Copied')).toBeOnTheScreen();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('screen and overlay respect the native safe-area context', async () => {
  await mount(
    <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 34, left: 5, right: 5 }}>
      <UI.Screen>
        <UI.Text>Safe content</UI.Text>
      </UI.Screen>
      <UI.Dialog defaultOpen>
        <UI.DialogContent testID="safe-panel">
          <UI.DialogTitle>Safe dialog</UI.DialogTitle>
        </UI.DialogContent>
      </UI.Dialog>
    </SafeAreaInsetsContext.Provider>,
  );
  expect(screen.getByTestId('safe-panel')).toHaveStyle({
    paddingTop: 64,
    paddingBottom: 54,
    paddingLeft: 25,
    paddingRight: 25,
  });
});
