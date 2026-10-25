import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOfficialRegistry, reviewedInputs } from './shadcn-registry.mjs';
import { portNativeRegistryRecipe, validateNativeChartRecipes } from './native-chart-recipes.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)),
  target = path.join(root, 'assets/ui/native-example-recipes.json.gz');
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const loadNativeExampleRecipes = () => JSON.parse(gunzipSync(readFileSync(target)));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  if (process.argv.includes('--check')) {
    validateNativeChartRecipes(inventory, loadNativeExampleRecipes());
    console.log('Native component example source/style/dependency evidence passed.');
  } else {
    const index = process.argv.indexOf('--source');
    if (index < 0 || !process.argv[index + 1])
      throw Error('Pass --source /absolute/path/to/the/pinned/shadcn-ui');
    const upstream = path.resolve(process.argv[index + 1]),
      recipes = [];
    const names = [
      'alert-demo',
      'alert-destructive',
      'alert-dialog-demo',
      'badge-destructive',
      'badge-outline',
      'badge-secondary',
      'button-default',
      'button-demo',
      'button-destructive',
      'button-ghost',
      'button-group-demo',
      'button-group-input',
      'button-group-nested',
      'button-group-select',
      'button-group-separator',
      'button-group-size',
      'button-icon',
      'button-link',
      'button-loading',
      'button-outline',
      'button-secondary',
      'button-size',
      'combobox-demo',
      'context-menu-demo',
      'dropdown-menu-demo',
      'dropdown-menu-dialog',
      'dropdown-menu-radio-group',
      'field-checkbox',
      'field-choice-card',
      'field-fieldset',
      'field-input',
      'field-radio',
      'field-select',
      'field-slider',
      'field-switch',
      'field-textarea',
      'input-demo',
      'input-file',
      'input-disabled',
      'input-group-button-group',
      'input-group-button',
      'input-group-custom',
      'input-group-demo',
      'input-group-textarea',
      'empty-input-group',
      'empty-demo',
      'empty-icon',
      'empty-outline',
      'empty-background',
      'input-group-icon',
      'input-group-text',
      'input-otp-controlled',
      'input-otp-demo',
      'input-otp-separator',
      'input-with-button',
      'input-with-label',
      'item-icon',
      'item-variant',
      'kbd-button',
      'kbd-demo',
      'kbd-tooltip',
      'menubar-demo',
      'native-select-demo',
      'native-select-disabled',
      'native-select-groups',
      'native-select-invalid',
      'pagination-demo',
      'radio-group-demo',
      'select-demo',
      'select-scrollable',
      'skeleton-card',
      'slider-demo',
      'spinner-basic',
      'spinner-button',
      'spinner-color',
      'spinner-custom',
      'spinner-empty',
      'spinner-size',
      'table-demo',
      'tabs-demo',
      'textarea-demo',
      'textarea-disabled',
      'textarea-with-button',
      'textarea-with-label',
      'toggle-disabled',
      'toggle-group-demo',
      'toggle-group-disabled',
      'toggle-group-lg',
      'toggle-group-outline',
      'toggle-group-single',
      'toggle-group-sm',
      'toggle-lg',
      'toggle-outline',
      'toggle-sm',
      'toggle-with-text',
    ];
    const origins = names
      .map((name) => 'apps/v4/registry/new-york-v4/examples/' + name + '.tsx')
      .concat([
        'apps/v4/registry/bases/aria/examples/avatar-example.tsx',
        'apps/v4/registry/bases/aria/examples/button-example.tsx',
        'apps/v4/registry/bases/aria/examples/carousel-example.tsx',
        'apps/v4/registry/bases/aria/examples/checkbox-example.tsx',
        'apps/v4/registry/bases/aria/examples/collapsible-example.tsx',
        'apps/v4/registry/bases/aria/examples/command-example.tsx',
        'apps/v4/registry/bases/aria/examples/label-example.tsx',
        'apps/v4/registry/bases/aria/examples/native-select-example.tsx',
        'apps/v4/registry/bases/aria/examples/select-example.tsx',
        'apps/v4/registry/bases/aria/examples/pagination-example.tsx',
        'apps/v4/registry/bases/aria/examples/progress-example.tsx',
        'apps/v4/registry/bases/aria/examples/radio-group-example.tsx',
        'apps/v4/registry/bases/aria/examples/skeleton-example.tsx',
        'apps/v4/registry/bases/aria/examples/slider-example.tsx',
        'apps/v4/registry/bases/aria/examples/spinner-example.tsx',
        'apps/v4/registry/bases/aria/examples/switch-example.tsx',
        'apps/v4/registry/bases/aria/examples/tabs-example.tsx',
        'apps/v4/registry/bases/aria/examples/textarea-example.tsx',
        'apps/v4/registry/bases/aria/examples/toggle-example.tsx',
        'apps/v4/registry/bases/aria/examples/demo.tsx',
        'apps/v4/registry/bases/base/examples/avatar-example.tsx',
        'apps/v4/registry/bases/base/examples/button-group-example.tsx',
        'apps/v4/registry/bases/base/examples/carousel-example.tsx',
        'apps/v4/registry/bases/base/examples/checkbox-example.tsx',
        'apps/v4/registry/bases/base/examples/collapsible-example.tsx',
        'apps/v4/registry/bases/base/examples/command-example.tsx',
        'apps/v4/registry/bases/base/examples/context-menu-example.tsx',
        'apps/v4/registry/bases/base/examples/dropdown-menu-example.tsx',
        'apps/v4/registry/bases/base/examples/label-example.tsx',
        'apps/v4/registry/bases/base/examples/menubar-example.tsx',
        'apps/v4/registry/bases/base/examples/native-select-example.tsx',
        'apps/v4/registry/bases/base/examples/pagination-example.tsx',
        'apps/v4/registry/bases/base/examples/progress-example.tsx',
        'apps/v4/registry/bases/base/examples/radio-group-example.tsx',
        'apps/v4/registry/bases/base/examples/select-example.tsx',
        'apps/v4/registry/bases/base/examples/skeleton-example.tsx',
        'apps/v4/registry/bases/base/examples/slider-example.tsx',
        'apps/v4/registry/bases/base/examples/switch-example.tsx',
        'apps/v4/registry/bases/base/examples/table-example.tsx',
        'apps/v4/registry/bases/base/examples/tabs-example.tsx',
        'apps/v4/registry/bases/base/examples/textarea-example.tsx',
        'apps/v4/registry/bases/base/examples/toast-example.tsx',
        'apps/v4/registry/bases/base/examples/toggle-example.tsx',
        'apps/v4/registry/bases/base/examples/demo.tsx',
        'apps/v4/registry/bases/radix/examples/avatar-example.tsx',
        'apps/v4/registry/bases/radix/examples/button-example.tsx',
        'apps/v4/registry/bases/radix/examples/button-group-example.tsx',
        'apps/v4/registry/bases/radix/examples/carousel-example.tsx',
        'apps/v4/registry/bases/radix/examples/checkbox-example.tsx',
        'apps/v4/registry/bases/radix/examples/collapsible-example.tsx',
        'apps/v4/registry/bases/radix/examples/command-example.tsx',
        'apps/v4/registry/bases/radix/examples/context-menu-example.tsx',
        'apps/v4/registry/bases/radix/examples/dropdown-menu-example.tsx',
        'apps/v4/registry/bases/radix/examples/label-example.tsx',
        'apps/v4/registry/bases/radix/examples/menubar-example.tsx',
        'apps/v4/registry/bases/radix/examples/native-select-example.tsx',
        'apps/v4/registry/bases/radix/examples/pagination-example.tsx',
        'apps/v4/registry/bases/radix/examples/popover-example.tsx',
        'apps/v4/registry/bases/radix/examples/progress-example.tsx',
        'apps/v4/registry/bases/radix/examples/radio-group-example.tsx',
        'apps/v4/registry/bases/radix/examples/select-example.tsx',
        'apps/v4/registry/bases/radix/examples/skeleton-example.tsx',
        'apps/v4/registry/bases/radix/examples/slider-example.tsx',
        'apps/v4/registry/bases/radix/examples/switch-example.tsx',
        'apps/v4/registry/bases/radix/examples/table-example.tsx',
        'apps/v4/registry/bases/radix/examples/tabs-example.tsx',
        'apps/v4/registry/bases/radix/examples/textarea-example.tsx',
        'apps/v4/registry/bases/radix/examples/toggle-example.tsx',
        'apps/v4/registry/bases/radix/examples/demo.tsx',
      ]);
    origins.push(
      'apps/v4/registry/bases/aria/examples/sonner-example.tsx',
      'apps/v4/registry/bases/aria/examples/table-example.tsx',
      'apps/v4/registry/bases/base/examples/popover-example.tsx',
      'apps/v4/registry/bases/base/examples/sonner-example.tsx',
      'apps/v4/registry/new-york-v4/examples/accordion-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/avatar-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/badge-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/button-rounded.tsx',
      'apps/v4/registry/new-york-v4/examples/button-group-dropdown.tsx',
      'apps/v4/registry/new-york-v4/examples/button-group-popover.tsx',
      'apps/v4/registry/new-york-v4/examples/button-group-input-group.tsx',
      'apps/v4/registry/new-york-v4/examples/button-group-orientation.tsx',
      'apps/v4/registry/new-york-v4/examples/carousel-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/carousel-size.tsx',
      'apps/v4/registry/new-york-v4/examples/carousel-spacing.tsx',
      'apps/v4/registry/new-york-v4/examples/carousel-orientation.tsx',
      'apps/v4/registry/new-york-v4/examples/collapsible-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/combobox-dropdown-menu.tsx',
      'apps/v4/registry/new-york-v4/examples/combobox-popover.tsx',
      'apps/v4/registry/new-york-v4/examples/command-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/dialog-close-button.tsx',
      'apps/v4/registry/new-york-v4/examples/empty-avatar.tsx',
      'apps/v4/registry/new-york-v4/examples/empty-avatar-group.tsx',
      'apps/v4/registry/new-york-v4/examples/hover-card-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/input-with-text.tsx',
      'apps/v4/registry/new-york-v4/examples/input-group-label.tsx',
      'apps/v4/registry/new-york-v4/examples/input-group-tooltip.tsx',
      'apps/v4/registry/new-york-v4/examples/input-group-dropdown.tsx',
      'apps/v4/registry/new-york-v4/examples/input-group-spinner.tsx',
      'apps/v4/registry/new-york-v4/examples/item-avatar.tsx',
      'apps/v4/registry/new-york-v4/examples/item-group.tsx',
      'apps/v4/registry/new-york-v4/examples/item-dropdown.tsx',
      'apps/v4/registry/new-york-v4/examples/kbd-input-group.tsx',
      'apps/v4/registry/new-york-v4/examples/kbd-group.tsx',
      'apps/v4/registry/new-york-v4/examples/label-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/popover-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/progress-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/scroll-area-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/separator-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/sheet-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/sheet-side.tsx',
      'apps/v4/registry/new-york-v4/examples/skeleton-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/sonner-types.tsx',
      'apps/v4/registry/new-york-v4/examples/spinner-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/spinner-badge.tsx',
      'apps/v4/registry/new-york-v4/examples/spinner-input-group.tsx',
      'apps/v4/registry/new-york-v4/examples/spinner-item.tsx',
      'apps/v4/registry/new-york-v4/examples/switch-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/textarea-with-text.tsx',
      'apps/v4/registry/new-york-v4/examples/toggle-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/tooltip-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-blockquote.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-h1.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-h2.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-h3.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-h4.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-inline-code.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-large.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-lead.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-muted.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-p.tsx',
      'apps/v4/registry/new-york-v4/examples/typography-small.tsx',
      'apps/v4/registry/bases/radix/examples/sonner-example.tsx',
      'apps/v4/registry/new-york-v4/examples/carousel-api.tsx',
      'apps/v4/registry/new-york-v4/examples/resizable-demo.tsx',
      'apps/v4/registry/new-york-v4/examples/resizable-demo-with-handle.tsx',
      'apps/v4/registry/new-york-v4/examples/resizable-vertical.tsx',
      'apps/v4/registry/new-york-v4/examples/resizable-handle.tsx',
      'apps/v4/registry/bases/base/examples/resizable-example.tsx',
      'apps/v4/registry/bases/radix/examples/resizable-example.tsx',
      'apps/v4/registry/bases/aria/examples/resizable-example.tsx',
    );
    origins.push('apps/v4/registry/new-york-v4/examples/aspect-ratio-demo.tsx');
    origins.push('apps/v4/registry/new-york-v4/examples/card-demo.tsx');
    origins.push('apps/v4/registry/new-york-v4/examples/card-with-form.tsx');
    origins.push('apps/v4/registry/bases/base/examples/button-example.tsx');
    for (const name of [
      'button-as-child',
      'breadcrumb-demo',
      'breadcrumb-separator',
      'breadcrumb-dropdown',
      'breadcrumb-ellipsis',
      'breadcrumb-link',
    ])
      origins.push(`apps/v4/registry/new-york-v4/examples/${name}.tsx`);
    for (const base of ['base', 'radix', 'aria']) {
      origins.push(`apps/v4/registry/bases/${base}/examples/breadcrumb-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/badge-example.tsx`);
    }
    for (const base of ['base', 'radix', 'aria']) {
      origins.push(`apps/v4/registry/bases/${base}/examples/aspect-ratio-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/separator-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/card-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/input-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/kbd-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/input-group-example.tsx`);
    }
    for (const base of ['base', 'radix', 'aria']) {
      origins.push(`apps/v4/registry/bases/${base}/examples/alert-example.tsx`);
      origins.push(`apps/v4/registry/bases/${base}/examples/empty-example.tsx`);
    }
    // Published legacy examples are separate authored inputs, even when their names
    // match a maintained modern recipe. Never substitute modern source for them.
    const maintainedNames = new Set(origins.map((origin) => path.basename(origin, '.tsx')));
    for (const origin of Object.keys(inventory.sources)) {
      if (
        /#[^#]*registry\/(default|new-york)\/examples\//.test(origin) &&
        maintainedNames.has(path.basename(origin, '.tsx')) &&
        !/\/chart-/.test(origin)
      )
        origins.push(origin);
    }
    if (new Set(origins).size !== origins.length)
      throw Error(
        'Duplicate authored component example origin; review the maintained source list.',
      );
    for (const origin of origins) {
      const name = path.basename(origin, '.tsx');
      const input = inventory.sources[origin];
      if (!input) throw Error('Missing reviewed component example ' + name);
      const [file, embedded] = origin.split('#');
      const source = embedded
        ? JSON.parse(readFileSync(path.join(upstream, file), 'utf8')).files.find(
            (entry) => entry.path === embedded || embedded.endsWith('/' + entry.path),
          )?.content
        : readFileSync(path.join(upstream, file), 'utf8');
      if (typeof source !== 'string') throw Error('Missing published example source: ' + origin);
      if (hash(source) !== input.sha256) throw Error('Component example source drift: ' + origin);
      const support = false,
        itemKey = 'registry:example/' + (support ? name.replace(/-(?:schema|action)$/, '') : name),
        native = portNativeRegistryRecipe(source, origin, { nativeForms: true });
      recipes.push({
        kind: support ? 'support' : 'example',
        export: name === 'demo' ? 'Demo' : 'default',
        itemKey,
        style: origin.includes('/bases/')
          ? origin.split('/bases/')[1].split('/')[0]
          : (origin.match(/(?:registry\/|styles\/)(default|new-york-v4|new-york)\//)?.[1] ??
            (() => {
              throw Error('Unknown example registry: ' + origin);
            })()),
        name,
        origin,
        upstreamSha256: input.sha256,
        reviewedInputs: reviewedInputs(inventory, itemKey),
        nativeSha256: hash(native),
        source: native,
      });
    }
    writeFileSync(
      target,
      gzipSync(JSON.stringify({ schemaVersion: 1, upstream: inventory.source, recipes }), {
        level: 9,
      }),
    );
    console.log(
      'Generated',
      recipes.length,
      'native component examples from pinned official source.',
    );
  }
}
