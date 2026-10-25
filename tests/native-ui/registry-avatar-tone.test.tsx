import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';
import * as UI from './.generated';
import { TextToneProvider } from './.generated/src/native/_core';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { IconPlaceholder } from './.generated/src/native/registry-example';
const Glyph = withRegistryStyles(IconPlaceholder, 'icon');
const visit = (node: any): any[] =>
  !node || typeof node !== 'object'
    ? []
    : Array.isArray(node)
      ? node.flatMap(visit)
      : [node, ...(node.children ?? []).flatMap(visit)];
test('Avatar source foregrounds override inherited text tone while direct glyph color classes retain ownership', async () => {
  let colors: Record<string, string> = {};
  function Sample() {
    colors = UI.useTheme().colors;
    return (
      <TextToneProvider value="#ff00ff">
        <UI.Avatar>
          <UI.AvatarFallback>Initials</UI.AvatarFallback>
          <UI.AvatarBadge>
            <Glyph lucide="CheckIcon" testID="default-glyph" />
          </UI.AvatarBadge>
        </UI.Avatar>
        <UI.AvatarBadge>
          <Glyph lucide="CheckIcon" testID="own-glyph" className="text-destructive" />
        </UI.AvatarBadge>
      </TextToneProvider>
    );
  }
  await render(
    <UI.ThemeProvider>
      <Sample />
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('Initials')).toHaveStyle({ color: colors['muted-foreground'] });
  for (const [id, color] of [
    ['default-glyph', colors['primary-foreground']],
    ['own-glyph', colors.destructive],
  ]) {
    const subtree = screen.getAllByTestId(id!)[0]!.toJSON();
    expect(visit(subtree).some((node) => node.props?.stroke?.payload === processColor(color))).toBe(
      true,
    );
  }
});
