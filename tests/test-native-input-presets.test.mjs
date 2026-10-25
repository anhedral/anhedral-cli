import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import { nativeInputPresets, nativeInputPresetSource } from '../scripts/native-input-presets.mjs';
const inventory = loadOfficialRegistry();
for (const component of ['input', 'textarea']) {
  test(`${component} retains six exact source recipes and eight distinct native style inputs`, async () => {
    const source = nativeInputPresets(inventory, component);
    assert.equal(Object.keys(source.presets).length, 8);
    assert.equal(Object.keys(source.classRecipes).length, 6);
    for (const [name, definition] of Object.entries(source.classRecipes)) {
      assert.equal(definition.sha256, inventory.sources[definition.origin].sha256);
      assert.ok(definition.recipe.base.length > 0, name);
    }
    assert.notEqual(source.presets.sera.rules.base, source.presets.nova.rules.base);
    assert.match(source.presets.sera.rules.base, /border-b-input/);
    const output = await nativeInputPresetSource(inventory, component);
    assert.match(output, /export const native(?:Input|Textarea)PresetSource/);
    assert.ok(output.includes(inventory.source.commit));
  });
  test(`${component} rejects changed source, corrupt style bytes and new selectors`, () => {
    const original = nativeInputPresets(inventory, component);
    const source = structuredClone(inventory);
    source.sources[original.classRecipes.aria.origin].sha256 = '0'.repeat(64);
    assert.throws(() => nativeInputPresets(source, component), /source changed/);
    const corrupt = structuredClone(inventory);
    corrupt.styleSheets['style-nova.css'].content += ' corrupt bytes';
    assert.throws(() => nativeInputPresets(corrupt, component), /integrity/);
    const selector = structuredClone(inventory);
    selector.styleSheets['style-nova.css'].content +=
      '\n.cn-' + component + '-new-variant { @apply h-12; }';
    selector.styleSheets['style-nova.css'].sha256 = sha256(
      selector.styleSheets['style-nova.css'].content,
    );
    assert.throws(() => nativeInputPresets(selector, component), /selectors need native review/);
  });
}

test('Android TextInput side-color workaround preserves border-box size and every text inset', async () => {
  const ts = await import('typescript');
  const source = readFileSync(
    new URL('../assets/ui/native/_input-border.tsx', import.meta.url),
    'utf8',
  );
  const { outputText } = ts.default.transpileModule(source, {
    compilerOptions: {
      module: ts.default.ModuleKind.ESNext,
      target: ts.default.ScriptTarget.ES2022,
    },
  });
  const { nativeTextInputBorderStyle: adapt } = await import(
    'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
  );
  const sourceStyle = {
    height: 40,
    width: 160,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: '#123456',
    paddingHorizontal: 0,
    paddingVertical: 4,
  };
  const actual = adapt(sourceStyle, 'android');
  assert.equal(actual.height, 40);
  assert.equal(actual.width, 160);
  assert.equal(actual.borderColor, '#123456');
  assert.ok(!('borderBottomColor' in actual));
  for (const edge of ['Top', 'Right', 'Bottom', 'Left']) {
    const beforeBorder = sourceStyle['border' + edge + 'Width'] ?? sourceStyle.borderWidth;
    const beforePadding =
      sourceStyle['padding' + edge] ??
      sourceStyle[edge === 'Top' || edge === 'Bottom' ? 'paddingVertical' : 'paddingHorizontal'];
    assert.equal(
      actual['border' + edge + 'Width'] + (actual['padding' + edge] ?? beforePadding),
      beforeBorder + beforePadding,
    );
  }
  assert.equal(actual.borderBottomWidth, 1);
  assert.equal(actual.borderTopWidth, 0);
  assert.equal(actual.borderRightWidth, 0);
  assert.equal(actual.borderLeftWidth, 0);
  assert.equal(adapt(sourceStyle, 'ios'), sourceStyle);
  const solid = { borderColor: '#123456', borderWidth: 1 };
  assert.equal(adapt(solid, 'android'), solid);
  const hidden = adapt({ ...sourceStyle, borderBottomWidth: 0 }, 'android');
  assert.equal(hidden.borderColor, 'transparent');
  assert.ok(!('borderBottomColor' in hidden));
});
