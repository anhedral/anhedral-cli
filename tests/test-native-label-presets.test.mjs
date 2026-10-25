import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import { nativeLabelPresets, reviewedLabelSources } from '../scripts/native-label-presets.mjs';
test('label review retains all six implementations, sixteen theme slots and distinct disabled/peer policies', () => {
  const output = nativeLabelPresets(loadOfficialRegistry());
  assert.equal(Object.keys(output.sources).length, 6);
  assert.equal(
    Object.values(output.presets).reduce((n, p) => n + Object.keys(p.rules).length, 0),
    16,
  );
  assert.match(output.sources.default.classes, /peer-disabled:opacity-70/);
  assert.match(output.sources['new-york-v4'].classes, /group-data-\[disabled=true\]:opacity-50/);
  assert.match(output.sources.aria.classes, /cn-label-aria/);
  assert.match(output.presets.sera.rules.label, /peer-data-\[slot=checkbox\]:normal-case/);
  assert.match(output.presets.lyra.rules.label, /text-xs/);
  assert.doesNotMatch(output.presets.lyra.rules.label, /font-medium/);
});
test('changed label code, styles and unreviewed descendant selectors require renewed review', () => {
  for (const input of Object.values(reviewedLabelSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[input.origin].sha256 = 'changed';
    assert.throws(() => nativeLabelPresets(inventory), /source changed/);
  }
  for (const selector of ['.cn-label-new', '.cn-label > svg']) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeLabelPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeLabelPresets(inventory), /integrity/);
});

test('native recipe translation preserves dynamic and literal disabled field groups', async () => {
  const { portNativeRegistryRecipe } = await import('../scripts/native-chart-recipes.mjs');
  for (const value of ['{disabled}', '"true"', '"false"']) {
    const source = `import {Field} from '@/registry/bases/base/ui/field';import {Label} from '@/registry/bases/base/ui/label';import {Input} from '@/registry/bases/base/ui/input';export default function Example(){const disabled=true;return <Field data-disabled=${value}><Label htmlFor="name">Name</Label><Input id="name" disabled={disabled}/></Field>}`;
    const output = portNativeRegistryRecipe(
      source,
      'apps/v4/registry/bases/base/examples/fixture.tsx',
      { nativeForms: true },
    );
    assert.doesNotMatch(output, /data-disabled/);
    assert.match(
      output,
      new RegExp(
        'disabled=\\{' +
          (value === '"true"' ? 'true' : value === '"false"' ? 'false' : 'disabled') +
          '\\}',
      ),
    );
    assert.match(output, /controlID="name"/);
  }
});
