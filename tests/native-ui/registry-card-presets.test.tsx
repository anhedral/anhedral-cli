import React, { createRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeComponentStyleProvider,
  NativeRegistryPalette,
  type NativeComponentStyle,
} from './.generated/src/native/_registry-context';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { NativeRegistryImage } from './.generated/src/native/registry-image';
import { nativePresetCardStyle } from './.generated/src/native/_preset-card-style';
const styles = {
  nova: [16, 12, 11.2, 16, 14, 22, 4],
  vega: [24, 16, 11.2, 16, 14, 24, 4],
  mira: [16, 12, 8, 14, 14, 20, 4],
  lyra: [16, 12, 0, 14, 14, 20, 4],
  maia: [24, 16, 14.4, 16, 16, 24, 8],
  luma: [24, 16, 20.8, 16, 16, 24, 6],
  rhea: [20, 16, 20.8, 16, 16, 24, 6],
  sera: [32, 20, 0, 18, 18, 28, 6],
  default: [0, 0, 8, 24, 24, 24, 6],
  'new-york': [0, 0, 12, 14, 14, 14, 6],
  'new-york-v4': [24, 24, 11.2, 14, 14, 14, 8],
} as const;
const mount = (style: NativeComponentStyle, children: React.ReactNode) =>
  render(
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style={style}>{children}</NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
for (const [name, metrics] of Object.entries(styles))
  for (const size of ['default', 'sm'] as const)
    test(`${name} ${size} Card preserves root, section, title and footer source metrics`, async () => {
      const [regular, small, radius, title, smallTitle, line, gap] = metrics;
      await mount(
        name as NativeComponentStyle,
        <UI.Card size={size} testID="root">
          <UI.CardHeader testID="header">
            <UI.CardTitle testID="title">Heading</UI.CardTitle>
            <UI.CardDescription testID="description">Details</UI.CardDescription>
          </UI.CardHeader>
          <UI.CardContent testID="body">Body</UI.CardContent>
          <UI.CardFooter testID="footer">Footer</UI.CardFooter>
        </UI.Card>,
      );
      const root = StyleSheet.flatten(screen.getByTestId('root').props.style),
        header = StyleSheet.flatten(screen.getByTestId('header').props.style),
        footer = StyleSheet.flatten(screen.getByTestId('footer').props.style);
      expect(root.borderRadius ?? 0).toBeCloseTo(radius);
      const spacing = size === 'sm' ? small : regular;
      expect(root.paddingTop ?? root.paddingVertical ?? root.padding ?? 0).toBe(spacing);
      expect(root.paddingBottom ?? spacing).toBe(name === 'nova' || name === 'lyra' ? 0 : spacing);
      const legacy = name === 'default' || name === 'new-york';
      expect(header.paddingLeft ?? header.paddingHorizontal ?? header.padding).toBe(
        legacy ? 24 : spacing,
      );
      expect(header.gap ?? header.rowGap).toBe(gap);
      expect(screen.getByTestId('title')).toHaveStyle({
        fontSize: size === 'sm' ? smallTitle : title,
        fontWeight: name === 'sera' || legacy || name === 'new-york-v4' ? '600' : '500',
        lineHeight:
          size === 'sm' && name === 'nova' ? 19.25 : size === 'sm' && name === 'vega' ? 21 : line,
      });
      expect(screen.getByTestId('description')).toHaveStyle({
        fontSize: name === 'mira' || name === 'lyra' ? 12 : 14,
      });
      if (name === 'nova' || name === 'lyra')
        expect(footer).toMatchObject({ borderTopWidth: 1, padding: spacing });
      else expect(footer.borderTopWidth).toBeUndefined();
      if (name !== 'nova') expect(footer.backgroundColor).toBeUndefined();
      expect(screen.getByText('Body')).toBeOnTheScreen();
    });
test('Sera heading case and tracking are native text styles, and authored text/view overrides win', async () => {
  const StyledCard = withRegistryStyles(UI.Card, 'view'),
    Title = withRegistryStyles(UI.CardTitle, 'text');
  await mount(
    'sera',
    <StyledCard testID="card" className="text-lg rounded-none" style={{ padding: 7 }}>
      <UI.CardTitle testID="default-title">Case</UI.CardTitle>
      <Title
        testID="title"
        className="normal-case tracking-wide text-xl"
        style={{ fontWeight: '400' }}
      >
        Custom
      </Title>
      <UI.CardContent>Inherited body</UI.CardContent>
    </StyledCard>,
  );
  expect(screen.getByTestId('default-title')).toHaveStyle({
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  });
  expect(screen.getByTestId('title')).toHaveStyle({
    textTransform: 'none',
    letterSpacing: 0.5,
    fontSize: 20,
    fontWeight: '400',
  });
  expect(screen.getByTestId('card')).toHaveStyle({ borderRadius: 0, padding: 7 });
  expect(screen.getByText('Inherited body')).toHaveStyle({ fontSize: 18 });
});
test('Card header preserves actionable content in its right-hand slot through fragments and styled wrappers', async () => {
  const Action = withRegistryStyles(UI.CardAction, 'view'),
    press = jest.fn();
  await mount(
    'nova',
    <UI.Card>
      <UI.CardHeader testID="header">
        <>
          <UI.CardTitle>Account</UI.CardTitle>
          <UI.CardDescription>Manage account</UI.CardDescription>
        </>
        <Action testID="action">
          <UI.Button onPress={press}>Settings</UI.Button>
        </Action>
      </UI.CardHeader>
    </UI.Card>,
  );
  expect(screen.getByTestId('header')).toHaveStyle({ flexDirection: 'row', gap: 4 });
  expect(screen.getByTestId('action')).toHaveStyle({ alignSelf: 'flex-start' });
  await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
  expect(press).toHaveBeenCalledTimes(1);
});
test('footer and direct image conditions traverse fragments, preserve refs and consumer corners, and ignore avatars', async () => {
  const imageRef = createRef<Image>(),
    cardRef = createRef<View>(),
    Footer = withRegistryStyles(UI.CardFooter, 'view');
  await mount(
    'rhea',
    <UI.Card ref={cardRef} testID="card">
      <>
        <Image
          testID="image"
          ref={imageRef}
          source={{ uri: 'https://example.com/image.png' }}
          style={{ borderTopLeftRadius: 3, width: 100, height: 100 }}
        />
        <UI.CardContent>Picture</UI.CardContent>
        <NativeRegistryImage testID="last" src="https://example.com/last.png" alt="Last" />
      </>
    </UI.Card>,
  );
  expect(cardRef.current).toBeTruthy();
  expect(imageRef.current).toBeTruthy();
  expect(screen.getByTestId('card')).toHaveStyle({ paddingTop: 0 });
  expect(screen.getByTestId('image')).toHaveStyle({
    borderTopLeftRadius: 3,
    borderTopRightRadius: 20.8,
  });
  expect(screen.getByTestId('last')).toHaveStyle({
    borderBottomLeftRadius: 20.8,
    borderBottomRightRadius: 20.8,
  });
  const tree = await mount(
    'nova',
    <UI.Card testID="footer-card">
      <>
        <UI.CardContent>Body</UI.CardContent>
        <Footer>Foot</Footer>
      </>
    </UI.Card>,
  );
  expect(screen.getByTestId('footer-card')).toHaveStyle({ paddingBottom: 0 });
  await tree.rerender(
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style="nova">
        <UI.Card testID="footer-card">
          <UI.CardContent>Body</UI.CardContent>
        </UI.Card>
      </NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('footer-card').props.style).paddingBottom).toBe(16);
});
test('conditional authored section borders add spacing only when the native border is present', async () => {
  for (const name of ['vega', 'new-york-v4'] as const) {
    await mount(
      name,
      <UI.Card>
        <UI.CardHeader testID="header" style={{ borderBottomWidth: 1 }}>
          <UI.CardTitle>Border</UI.CardTitle>
        </UI.CardHeader>
        <UI.CardFooter testID="footer" style={{ borderTopWidth: 1 }}>
          Footer
        </UI.CardFooter>
      </UI.Card>,
    );
    expect(screen.getByTestId('header')).toHaveStyle({ paddingBottom: 24 });
    expect(screen.getByTestId('footer')).toHaveStyle({ paddingTop: 24 });
  }
});
test('Vega direct QuestionnaireChoices conditional belongs to CardContent alone', async () => {
  await mount(
    'vega',
    <UI.Card>
      <UI.CardContent testID="choices">
        <UI.QuestionnaireChoices>Options</UI.QuestionnaireChoices>
      </UI.CardContent>
      <UI.CardContent testID="plain">
        <View>
          <UI.Text>Plain</UI.Text>
        </View>
      </UI.CardContent>
    </UI.Card>,
  );
  expect(screen.getByTestId('choices')).toHaveStyle({ flexDirection: 'column', gap: 12 });
  expect(StyleSheet.flatten(screen.getByTestId('plain').props.style).gap).toBeUndefined();
});
test('frozen source scopes override an outer modern preset and retain inherited plain title text', async () => {
  await mount(
    'sera',
    <NativeRegistryPalette source="new-york" generation="legacy">
      <UI.Card testID="frozen">
        <UI.CardTitle testID="title">Legacy</UI.CardTitle>
      </UI.Card>
    </NativeRegistryPalette>,
  );
  expect(screen.getByTestId('frozen')).toHaveStyle({ borderRadius: 12, borderWidth: 1 });
  expect(screen.getByTestId('title')).toHaveStyle({ fontSize: 14, lineHeight: 14 });
});
test('source rings retain light/dark opacity and Rhea caps only the authored corners', () => {
  const colors = {
    card: '#ffffff',
    'card-foreground': '#111111',
    foreground: '#000000',
    border: '#cccccc',
    ring: '#123456',
  };
  const light = nativePresetCardStyle('luma', 'Card', { mode: 'light', radius: 40, colors }),
    dark = nativePresetCardStyle('luma', 'Card', { mode: 'dark', radius: 40, colors }),
    rhea = nativePresetCardStyle('rhea', 'Card', {
      mode: 'light',
      radius: 40,
      colors,
      firstImage: true,
    });
  expect(light.view.boxShadow).not.toEqual(dark.view.boxShadow);
  expect(rhea.view.borderRadius).toBe(24);
  expect(rhea.imageCorners.first).toEqual({ borderTopLeftRadius: 24, borderTopRightRadius: 24 });
});

test('explicit native letter spacing and line height override authored relative utilities', async () => {
  const Title = withRegistryStyles(UI.CardTitle, 'text'),
    Card = withRegistryStyles(UI.Card, 'view');
  await mount(
    'lyra',
    <Card className="text-lg" textStyle={{ lineHeight: 33 }}>
      <Title
        testID="title"
        className="tracking-wide leading-relaxed"
        style={{ fontSize: 19, letterSpacing: 2, lineHeight: 31 }}
      >
        Explicit metrics
      </Title>
      <UI.CardContent>Explicit body</UI.CardContent>
    </Card>,
  );
  expect(screen.getByTestId('title')).toHaveStyle({
    fontSize: 19,
    letterSpacing: 2,
    lineHeight: 31,
  });
  expect(screen.getByText('Explicit body')).toHaveStyle({ fontSize: 18, lineHeight: 33 });
});

test('opaque and dynamically mounted footers register with their own Card and release membership', async () => {
  function Footer({ visible }: { visible: boolean }) {
    return visible ? <UI.CardFooter>Dynamic footer</UI.CardFooter> : null;
  }
  const tree = await mount(
    'nova',
    <UI.Card testID="card">
      <UI.CardContent>Body</UI.CardContent>
      <Footer visible />
    </UI.Card>,
  );
  expect(screen.getByTestId('card')).toHaveStyle({ paddingBottom: 0 });
  await tree.rerender(
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style="nova">
        <UI.Card testID="card">
          <UI.CardContent>Body</UI.CardContent>
          <Footer visible={false} />
        </UI.Card>
      </NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('card')).toHaveStyle({ paddingBottom: 16 });
  await tree.unmount();
});

test('native custom spacing and authored Card variables update every section and nested raw layout scope', async () => {
  const Card = withRegistryStyles(UI.Card, 'view'),
    Content = withRegistryStyles(UI.CardContent, 'view');
  const { RegistryView } = require('./.generated/src/native/registry-styles');
  const tree = await mount(
    'nova',
    <Card testID="card" className="[--card-spacing:--spacing(5)]">
      <UI.CardHeader testID="header">
        <UI.CardTitle>Spacing</UI.CardTitle>
      </UI.CardHeader>
      <Content testID="content" className="-mb-(--card-spacing)">
        <RegistryView testID="inner" className="px-(--card-spacing)" />
      </Content>
      <UI.CardFooter testID="footer">Footer</UI.CardFooter>
    </Card>,
  );
  expect(screen.getByTestId('card')).toHaveStyle({ paddingTop: 20, gap: 20, paddingBottom: 0 });
  expect(screen.getByTestId('header')).toHaveStyle({ paddingLeft: 20, paddingRight: 20 });
  expect(screen.getByTestId('content')).toHaveStyle({ paddingLeft: 20, marginBottom: -20 });
  expect(screen.getByTestId('inner')).toHaveStyle({ paddingLeft: 20 });
  expect(screen.getByTestId('footer')).toHaveStyle({ padding: 20 });
  await tree.rerender(
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style="luma">
        <UI.Card spacing={0} testID="card">
          <UI.CardHeader testID="header">
            <UI.CardTitle>Zero spacing</UI.CardTitle>
          </UI.CardHeader>
        </UI.Card>
      </NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('card')).toHaveStyle({ paddingTop: 0, paddingBottom: 0, gap: 0 });
  expect(screen.getByTestId('header')).toHaveStyle({ paddingLeft: 0 });
});

test('keyed Card fragments retain independent child state when reordered', async () => {
  function Counter({ name }: { name: string }) {
    const [count, set] = React.useState(0);
    return <UI.Button onPress={() => set(count + 1)}>{name + ': ' + count}</UI.Button>;
  }
  const sample = (reverse = false) => (
    <UI.ThemeProvider>
      <UI.Card>
        {(reverse ? ['B', 'A'] : ['A', 'B']).map((name) => (
          <React.Fragment key={name}>
            <Counter name={name} />
          </React.Fragment>
        ))}
      </UI.Card>
    </UI.ThemeProvider>
  );
  const warn = jest.spyOn(console, 'error');
  try {
    const tree = await render(sample());
    await fireEvent.press(screen.getByRole('button', { name: 'A: 0' }));
    await tree.rerender(sample(true));
    expect(screen.getByRole('button', { name: 'A: 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'B: 0' })).toBeOnTheScreen();
    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});
