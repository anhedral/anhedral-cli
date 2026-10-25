import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(
  new URL('../assets/ui/native/_registry-css.tsx', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { registryStyle } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
);
const options = { width: 800, radius: 8, color: (value) => 'color:' + value };
test('native recipe utility translation keeps responsive layout, text inheritance, selectors and state', () => {
  const result = registryStyle(
    'flex flex-col gap-2 sm:flex-row text-3xl font-bold leading-none [&>div]:p-4 [&>*]:basis-1/4 first:fill-muted last:fill-background data-[active=true]:bg-muted/50 even:border-l',
    { ...options, index: 1, active: true },
  );
  assert.equal(result.view.flexDirection, 'row');
  assert.equal(result.view.gap, 8);
  assert.equal(result.text.fontSize, 30);
  assert.equal(result.text.lineHeight, 30);
  assert.equal(result.text.fontWeight, '700');
  assert.deepEqual(result.children, ['p-4', 'basis-1/4']);
  assert.equal(result.paint.firstFill, 'color:muted');
  assert.equal(result.paint.lastFill, 'color:background');
  assert.equal(result.view.backgroundColor, 'color:muted/50');
  assert.equal(result.view.borderLeftWidth, 1);
  assert.equal(registryStyle('md:flex!', { ...options, width: 320 }).view.display, undefined);
  assert.equal(registryStyle('hidden md:flex!', options).view.display, 'flex');
});
test('native recipe utilities preserve dimensions, spacing, transforms and colors without DOM style strings', () => {
  const s = registryStyle(
    'mx-auto sm:px-6 h-[250px] w-[8rem] max-w-md text-muted-foreground -translate-y-2 rotate-[-40deg] fill-(--color-label) opacity-20 border-t-0',
    options,
  );
  assert.equal(s.view.marginLeft, 'auto');
  assert.equal(s.view.marginRight, 'auto');
  assert.equal(s.view.paddingLeft, 24);
  assert.equal(s.view.height, 250);
  assert.equal(s.view.width, 128);
  assert.equal(s.view.maxWidth, 448);
  assert.equal(s.text.color, 'color:muted-foreground');
  assert.equal(s.paint.fill, 'color:(--color-label)');
  assert.deepEqual(s.view.transform, [{ translateY: -8 }, { rotate: '-40deg' }]);
  assert.equal(s.view.opacity, 0.2);
  assert.equal(s.view.borderTopWidth, 0);
  assert.throws(() => registryStyle('hover:invented', options), /Unreviewed/);
  assert.throws(() => registryStyle('w-[calc(50%-2px)]', options), /Unsupported/);
});

test('native utility cascade keeps important classes, SVG child selectors, borders and motion metadata', () => {
  const s = registryStyle(
    '!items-start items-center [&>svg]:w-2.5 border border-border/50 border-dashed shadow-xl transition-all ease-in-out hover:-translate-y-0.5',
    options,
  );
  assert.equal(s.view.alignItems, 'flex-start');
  assert.deepEqual(s.svgChildren, ['w-2.5']);
  assert.equal(s.view.borderWidth, 1);
  assert.equal(s.view.borderColor, 'color:border/50');
  assert.equal(s.view.borderStyle, 'dashed');
  assert.equal(s.paint.transitionDuration, 150);
  assert.equal(s.paint.hoverTranslateY, -2);
  assert.equal(s.view.boxShadow.length, 2);
});

test('typography, child spacing and native border/shadow metrics preserve authored utilities', () => {
  const style = registryStyle(
    'text-xl leading-7 italic border-l-2 rounded shadow-md space-x-4 -space-x-2 first:mt-0 scroll-m-20',
    { ...options, index: 0 },
  );
  assert.deepEqual(style.text, { fontSize: 20, lineHeight: 28, fontStyle: 'italic' });
  assert.equal(style.view.borderLeftWidth, 2);
  assert.equal(style.view.borderRadius, 4);
  assert.equal(style.view.columnGap, 16);
  assert.equal(style.paint.childMarginStart, -8);
  assert.equal(style.view.boxShadow.length, 2);
  assert.equal(style.paint.webScrollMargin, 80);
  assert.equal(registryStyle('first:mt-4', { ...options, index: 1 }).view.marginTop, undefined);
  const radius = registryStyle('[--radius:1.2rem] rounded-lg', { ...options });
  assert.equal(radius.view.borderRadius, 19.2);
  assert.equal(radius.paint.radius, 19.2);
  const avatar = registryStyle('data-[slot=avatar]:ring-2 data-[slot=avatar]:ring-background', {
    ...options,
    slot: 'avatar',
  });
  assert.equal(avatar.view.boxShadow[0].spreadDistance, 2);
  assert.equal(avatar.view.boxShadow[0].color, 'color:background');
  assert.deepEqual(
    registryStyle('data-[slot=avatar]:ring-2', { ...options, slot: 'button' }).view,
    {},
  );
  assert.equal(
    registryStyle('data-[state=on]:bg-muted', { ...options, selected: false }).view.backgroundColor,
    undefined,
  );
  assert.equal(
    registryStyle('data-[state=on]:bg-muted', { ...options, selected: true }).view.backgroundColor,
    'color:muted',
  );
});
