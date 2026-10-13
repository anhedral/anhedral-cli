import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineBuildAsset, scriptContents } from '../shared/html.mjs';

test('build inlining accepts HTML tag case, quotes and closing whitespace', () => {
  const html = `<HTML><SCRIPT type="module" SRC = '/assets/app.js'>\n</sCrIpT >\n<LINK href='/assets/app.css' /></HTML>`;
  const script = 'console.log("$&")';
  const result = inlineBuildAsset(
    inlineBuildAsset(html, 'app.js', script),
    'app.css',
    'p{color:red}',
  );
  assert.deepEqual(scriptContents(result), [script]);
  assert.doesNotMatch(result, /\bsrc\s*=|\bhref\s*=/i);
  assert.match(result, /<style>@layer theme, base, components, utilities;p\{color:red\}<\/style>/);
});

test('inlined script and style literals cannot terminate their HTML containers', () => {
  const result = inlineBuildAsset(
    '<script src="app.js"></script>',
    'app.js',
    'const text = "</ScRiPt ><script>unexpected()</script>";',
  );
  assert.equal(scriptContents(result).length, 1);
  assert.equal((result.match(/<\/script\s*>/gi) ?? []).length, 1);
  const style = inlineBuildAsset(
    '<link href="app.css">',
    'app.css',
    'p::after{content:"</STYLE >"}',
  );
  assert.equal((style.match(/<\/style\s*>/gi) ?? []).length, 1);
});

test('CSP script extraction includes mixed-case tags and refuses unrecognized build assets', () => {
  assert.deepEqual(scriptContents('<SCRIPT>first()</ScRiPt >\n<script>second()</script\n>'), [
    'first()',
    'second()',
  ]);
  assert.throws(() => inlineBuildAsset('<html></html>', 'missing.js', ''), /could not be inlined/);
  assert.deepEqual(scriptContents('<scripture>not a script</scripture>'), []);
});
