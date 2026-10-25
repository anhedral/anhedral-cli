import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { nativeGlobalMetrics } from '../scripts/native-component-styles.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
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

test('SVG child restrictions resolve paint on the actual icon while keeping non-SVG descendants separate', () => {
  const icon = registryStyle('[svg]:fill-blue-500 [svg]:stroke-blue-500', {
    ...options,
    svg: true,
  });
  assert.equal(icon.paint.fill, 'color:blue-500');
  assert.equal(icon.paint.stroke, 'color:blue-500');
  assert.deepEqual(icon.svgChildren, []);
  const view = registryStyle('[svg]:fill-blue-500', { ...options, svg: false });
  assert.deepEqual(view.svgChildren, ['fill-blue-500']);
  assert.equal(view.paint.fill, undefined);
});

const radiusScale = nativeGlobalMetrics(loadOfficialRegistry()).globals.radius;
test('raw layouts use pinned modern radius multipliers and retain frozen legacy geometry', () => {
  for (const [name, multiplier] of Object.entries(radiusScale)) {
    assert.equal(
      registryStyle('rounded-' + name, { ...options, generation: 'modern', radiusScale }).view
        .borderRadius,
      8 * multiplier,
    );
  }
  for (const [name, value] of Object.entries({
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
    none: 0,
  })) {
    assert.equal(
      registryStyle('rounded-' + name, { ...options, generation: 'legacy' }).view.borderRadius,
      value,
    );
  }
  assert.equal(
    registryStyle('[--radius:2rem] rounded-xl', { ...options, generation: 'modern', radiusScale })
      .view.borderRadius,
    44.8,
  );
  assert.equal(registryStyle('rounded-sm', { ...options, radius: 2 }).view.borderRadius, 0);
  assert.equal(
    registryStyle('rounded-xs', { ...options, generation: 'modern', radiusScale }).view
      .borderRadius,
    2,
  );
  assert.throws(
    () => registryStyle('rounded-md', { ...options, generation: 'modern' }),
    /Missing native global radius metric/,
  );
});
test('radius variables and bounded source formulas remain native values with explicit rejection of unsupported math', () => {
  const modern = { ...options, generation: 'modern', radiusScale };
  for (const [utility, expected] of Object.entries({
    'rounded-(--radius)': 8,
    'rounded-(--radius-xl)': 11.2,
    'rounded-[var(--radius-sm)]': 4.8,
    'rounded-[calc(var(--radius)-2px)]': 6,
    'rounded-[calc(var(--radius)+0.5rem)]': 16,
    'rounded-[calc(var(--radius)-20px)]': 0,
    'rounded-[min(var(--radius-xl),10px)]': 10,
    'rounded-[max(2px,min(var(--radius-xl),10px),3px)]': 10,
    'rounded-[1.5rem]': 24,
  }))
    assert.equal(registryStyle(utility, modern).view.borderRadius, expected, utility);
  for (const utility of [
    'rounded-[calc(var(--radius)*2)]',
    'rounded-[min(2px)]',
    'rounded-[var(--invented)]',
    'rounded-[min(2px,garbage)]',
  ])
    assert.throws(() => registryStyle(utility, modern), /Unsupported native registry length/);
  assert.throws(
    () => registryStyle('rounded-(--radius-missing)', modern),
    /Missing native global radius metric/,
  );
  const deep = 'rounded-[' + 'min(2px,'.repeat(10) + '3px' + ')'.repeat(10) + ']';
  assert.throws(() => registryStyle(deep, modern), /nesting exceeds/);
});
test('physical and logical corners retain their independent native fields', () => {
  const style = registryStyle('rounded-t-xl rounded-br-none rounded-ss-sm rounded-ee-[3px]', {
    ...options,
    generation: 'modern',
    radiusScale,
  });
  assert.deepEqual(style.view, {
    borderTopLeftRadius: 11.2,
    borderTopRightRadius: 11.2,
    borderBottomRightRadius: 0,
    borderTopStartRadius: 4.8,
    borderBottomEndRadius: 3,
  });
  assert.deepEqual(
    registryStyle(
      'rounded-s-md rounded-e-md rounded-b-md rounded-l-md rounded-r-md rounded-tr-md rounded-bl-md rounded-se-md rounded-es-md',
      options,
    ).view,
    {
      borderTopStartRadius: 6,
      borderBottomStartRadius: 6,
      borderTopEndRadius: 6,
      borderBottomEndRadius: 6,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
  );
});

test('native animation metadata preserves pulse and lets explicit animate-none cancel it', () => {
  assert.equal(registryStyle('animate-pulse', options).paint.pulse, 1);
  assert.deepEqual(registryStyle('animate-pulse animate-spin animate-none', options).paint, {
    pulse: 0,
    spin: 0,
  });
});

test('font-size line-height modifiers retain source metrics, leading precedence and color opacity', () => {
  for (const [classes, fontSize, lineHeight] of [
    ['text-xs/relaxed', 12, 19.5],
    ['text-sm/6', 14, 24],
    ['text-base/normal', 16, 24],
    ['text-9xl/none', 128, 128],
    ['text-[0.875rem]/[1.25rem]', 14, 20],
    ['text-xs/relaxed leading-7', 12, 28],
    ['leading-7 text-xs/relaxed', 12, 28],
    ['!text-xs/relaxed leading-7', 12, 19.5],
    ['text-xs leading-7 leading-none', 12, 12],
    ['text-sm leading-[18px]', 14, 18],
  ])
    assert.deepEqual(registryStyle(classes, options).text, { fontSize, lineHeight }, classes);
  assert.equal(registryStyle('text-primary/50', options).text.color, 'color:primary/50');
  assert.throws(
    () => registryStyle('text-sm/unknown', options),
    /Unsupported native registry length/,
  );
});

test('authored flex boxes retain browser row defaults while explicit directions win in either class order', () => {
  for (const classes of ['flex', 'inline-flex', 'hidden md:flex'])
    assert.equal(registryStyle(classes, options).view.flexDirection, 'row');
  for (const classes of [
    'flex flex-col',
    'flex-col flex',
    'inline-flex flex-col',
    'flex-col inline-flex',
  ])
    assert.equal(registryStyle(classes, options).view.flexDirection, 'column');
  assert.equal(registryStyle('flex-col md:flex-row', options).view.flexDirection, 'row');
  assert.equal(
    registryStyle('flex-col md:flex-row', { ...options, width: 320 }).view.flexDirection,
    'column',
  );
});

test('native Card length variables preserve reviewed spacing formulas, negative margins and strict scope', () => {
  const result = registryStyle(
    '[--card-spacing:--spacing(5)] px-(--card-spacing) -mb-(--card-spacing)',
    options,
  );
  assert.equal(result.paint.cardSpacing, 20);
  assert.equal(result.view.paddingLeft, 20);
  assert.equal(result.view.paddingRight, 20);
  assert.equal(result.view.marginBottom, -20);
  assert.equal(
    registryStyle('py-(--card-spacing)', { ...options, cardSpacing: 12 }).view.paddingTop,
    12,
  );
  assert.throws(() => registryStyle('p-(--card-spacing)', options), /Unbound native Card spacing/);
  assert.throws(
    () => registryStyle('p-(--card-spacing)', { ...options, cardSpacing: Infinity }),
    /Invalid native Card spacing/,
  );
  assert.throws(
    () => registryStyle('p-(--card-spacing)', { ...options, cardSpacing: -1 }),
    /Invalid native Card spacing/,
  );
});

test('authored Card list, scroll, fixed icon track and link utilities retain explicit native policies', () => {
  const source = registryStyle(
    'grid grid-cols-[25px_1fr] inset-0 translate-y-1 mix-blend-color underline-offset-4 hover:underline overflow-y-scroll list-decimal',
    options,
  );
  assert.equal(source.paint.firstColumnWidth, 25);
  assert.equal(source.paint.columns, 2);
  assert.equal(source.view.inset, 0);
  assert.deepEqual(source.view.transform, [{ translateY: 4 }]);
  assert.equal(source.view.mixBlendMode, 'color');
  assert.equal(source.paint.nativeUnderlineOffset, 4);
  assert.equal(source.paint.hoverUnderline, 1);
  assert.equal(source.paint.scrollVertical, 1);
  assert.equal(source.paint.listMarker, 'decimal');
  assert.equal(
    registryStyle('mb-4 pb-4 last:mb-0 last:pb-0', { ...options, index: 2, count: 3 }).view
      .marginBottom,
    0,
  );
  assert.equal(
    registryStyle('mb-4 last:mb-0', { ...options, index: 1, count: 3 }).view.marginBottom,
    16,
  );
});

test('border width utilities preserve explicit all-edge and directional colors regardless of class order', () => {
  const result = registryStyle('border-transparent border-b-input border', options);
  assert.equal(result.view.borderWidth, 1);
  assert.equal(result.view.borderColor, 'color:transparent');
  assert.equal(result.view.borderBottomColor, 'color:input');
  const edges = registryStyle('border-red border-t-2 border-l-blue', options);
  assert.equal(edges.view.borderColor, 'color:red');
  assert.equal(edges.view.borderTopWidth, 2);
  assert.equal(edges.view.borderLeftColor, 'color:blue');
});

test('source container widths, constraint removal and grid content alignment retain native viewport semantics', () => {
  for (const [name, width] of [
    ['4xl', 896],
    ['5xl', 1024],
    ['6xl', 1152],
    ['7xl', 1280],
  ])
    assert.equal(registryStyle('max-w-' + name, options).view.maxWidth, width);
  assert.equal(
    registryStyle('max-w-lg lg:max-w-none', { ...options, width: 1200 }).view.maxWidth,
    undefined,
  );
  assert.equal(
    registryStyle('max-w-lg lg:max-w-none', { ...options, width: 700 }).view.maxWidth,
    512,
  );
  const single = registryStyle('grid min-h-screen content-center md:grid-cols-2', {
    ...options,
    width: 390,
    height: 844,
  });
  assert.equal(single.view.minHeight, 844);
  assert.equal(single.view.justifyContent, 'center');
  const pair = registryStyle('grid min-h-screen content-center md:grid-cols-2', {
    ...options,
    width: 800,
    height: 600,
  });
  assert.equal(pair.view.alignContent, 'center');
  assert.equal(pair.view.justifyContent, undefined);
  const flex = registryStyle('flex-1', options).view;
  assert.deepEqual(flex, { flexGrow: 1, flexShrink: 1, flexBasis: '0%' });
});

test('responsive and dark source rules retain precedence after base caller overrides', () => {
  assert.equal(registryStyle('md:gap-8 gap-4', { ...options, width: 800 }).view.gap, 32);
  assert.equal(
    registryStyle('lg:p-12 sm:p-6 p-4', { ...options, width: 1200 }).view.paddingTop,
    48,
  );
  assert.equal(
    registryStyle('dark:bg-background bg-muted', { ...options, mode: 'dark' }).view.backgroundColor,
    'color:background',
  );
  assert.equal(
    registryStyle('dark:bg-background bg-muted', { ...options, mode: 'light' }).view
      .backgroundColor,
    'color:muted',
  );
  assert.equal(registryStyle('p-0', options).view.paddingLeft, 0);
});

test('responsive flex-none resets percentage basis and growth instead of retaining earlier flex-one state', () => {
  const view = registryStyle('flex-1 md:flex-none', { ...options, width: 800 }).view;
  assert.equal(view.flexGrow, 0);
  assert.equal(view.flexShrink, 0);
  assert.equal(view.flexBasis, 'auto');
});

test('large source shadows retain both layers beneath the native ring', () => {
  const result = registryStyle('shadow-lg ring-1 ring-foreground/5', options);
  assert.deepEqual(result.view.boxShadow, [
    { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'color:foreground/5' },
    { offsetX: 0, offsetY: 10, blurRadius: 15, spreadDistance: -3, color: 'rgba(0,0,0,0.1)' },
    { offsetX: 0, offsetY: 4, blurRadius: 6, spreadDistance: -4, color: 'rgba(0,0,0,0.1)' },
  ]);
  assert.deepEqual(registryStyle('shadow-lg shadow-none', options).view.boxShadow, []);
});

test('source shadows and rings never add a second Android elevation shadow or stacking change', () => {
  for (const classes of [
    'shadow-xs',
    'shadow-sm',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',
    'shadow-none',
    'ring-1 ring-foreground/10',
  ]) {
    const result = registryStyle(classes, options);
    assert.equal(result.view.elevation, 0, classes);
    assert.ok(Array.isArray(result.view.boxShadow));
  }
});
