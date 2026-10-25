import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOfficialRegistry, reviewedInputs } from './shadcn-registry.mjs';
import { portNativeRegistryRecipe, validateNativeChartRecipes } from './native-chart-recipes.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)),
  target = path.join(root, 'assets/ui/native-form-recipes.json.gz');
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const loadNativeFormRecipes = () => JSON.parse(gunzipSync(readFileSync(target)));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  if (process.argv.includes('--check')) {
    validateNativeChartRecipes(inventory, loadNativeFormRecipes());
    console.log('Native form source/style/dependency evidence passed.');
  } else {
    const index = process.argv.indexOf('--source');
    if (index < 0 || !process.argv[index + 1])
      throw Error('Pass --source /absolute/path/to/the/pinned/shadcn-ui');
    const upstream = path.resolve(process.argv[index + 1]),
      recipes = [];
    for (const [origin, input] of Object.entries(inventory.sources)) {
      if (
        !/^apps\/v4\/registry\/new-york-v4\/examples\/form-(?:rhf|tanstack|formisch|next)-[a-z-]+\.tsx?$/.test(
          origin,
        )
      )
        continue;
      const source = readFileSync(path.join(upstream, origin), 'utf8');
      if (hash(source) !== input.sha256) throw Error('Form source drift: ' + origin);
      const name = path.basename(origin).replace(/\.tsx?$/, ''),
        support = /form-next-.*-(?:schema|action)$/.test(name),
        itemKey = 'registry:example/' + (support ? name.replace(/-(?:schema|action)$/, '') : name),
        native = portNativeRegistryRecipe(source, origin, { nativeForms: true });
      recipes.push({
        kind: support ? 'support' : 'example',
        itemKey,
        style: 'new-york-v4',
        name,
        origin,
        upstreamSha256: input.sha256,
        reviewedInputs: reviewedInputs(inventory, itemKey),
        nativeSha256: hash(native),
        source: native,
      });
    }
    if (recipes.length !== 34)
      throw Error(
        'Expected ten React Hook Form, nine TanStack Form and nine Formisch examples and both native action forms with their four schema/action companions.',
      );
    writeFileSync(
      target,
      gzipSync(JSON.stringify({ schemaVersion: 1, upstream: inventory.source, recipes }), {
        level: 9,
      }),
    );
    console.log('Generated', recipes.length, 'native form examples from pinned official source.');
  }
}
