import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** Exercise installed package bytes in a bounded process; never suppress an advisory. */
export function verifyBraces(packageRoot, originalRoot) {
  assert.equal(
    JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version,
    '3.0.3',
  );
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
    const assert = require('node:assert/strict');
    const braces = require(process.argv[1]);
    const original = process.argv[2] ? require(process.argv[2]) : null;
    const guarded = (fn) => assert.throws(fn, (error) => error instanceof RangeError && /braces nesting exceeds maximum depth of 100/.test(error.message));
    const patterns = ['{a,b}', 'pre{a,b}post', '{1..10}', '{01..05}', '{a..e}', '{a,{b,c}}', '{a,}', '{}', '{a}', '{', '}', 'a{b', 'a}b', '{a,b', '{a..b,c}', '{a..b}', '{1..3,foo}', '\\\\{a,b}', '","{a,b}', '\\u0024{a,b}', '(a{b,c})', '[{a,b}]', '{a,b}{c,d}', 'foo/{bar,baz}/*.js'];
    let comparisons = 0;
    for (const pattern of patterns) for (const options of [{}, {escapeInvalid:true}, {keepEscaping:true}, {keepQuotes:true}, {noempty:true,nodupes:true}]) {
      for (const method of ['compile', 'expand', 'stringify']) {
        let actual, expected, actualError, expectedError;
        try { actual = braces[method](pattern, options); } catch (error) { actualError = error.constructor.name + ':' + error.message; }
        if (original) {
          try { expected = original[method](pattern, options); } catch (error) { expectedError = error.constructor.name + ':' + error.message; }
          assert.equal(actualError, expectedError, method + ':' + pattern);
          assert.deepEqual(actual, expected, method + ':' + pattern);
          comparisons++;
        } else assert.equal(actualError, undefined, method + ':' + pattern);
      }
    }
    // Keep upstream stringify's parent argument behavior unchanged. Passing the
    // containing invalid brace to child calls would change escapeInvalid output.
    const invalid = () => ({type:'brace',invalid:true,nodes:[{type:'open',value:'{'},{type:'text',value:'a'},{type:'close',value:'}'}]});
    assert.equal(braces.stringify(invalid(), {escapeInvalid:true}), '{a}');
    if (original) assert.equal(braces.stringify(invalid(), {escapeInvalid:true}), original.stringify(invalid(), {escapeInvalid:true}));
    for (const [open, close] of [['{','}'], ['(',')']]) {
      const allowed = open.repeat(100) + 'x' + close.repeat(100);
      for (const method of ['parse','compile','expand','stringify']) {
        assert.doesNotThrow(() => braces[method](allowed));
        guarded(() => braces[method](open.repeat(101) + 'x' + close.repeat(101)));
        guarded(() => braces[method](open.repeat(2000) + 'x' + close.repeat(2000)));
      }
    }
    const mixed = '{('.repeat(50) + 'x' + ')}'.repeat(50);
    assert.doesNotThrow(() => braces.parse(mixed));
    guarded(() => braces.parse('(' + mixed + ')'));
    // Quoted, escaped and square-bracket literals are not parser nesting.
    assert.doesNotThrow(() => braces.parse('"' + '{('.repeat(200) + '"'));
    assert.doesNotThrow(() => braces.parse('[' + '{('.repeat(200) + ']'));
    assert.doesNotThrow(() => braces.parse('\\\\{'.repeat(200)));
    // Width is deliberately unchanged; this patch only bounds nesting.
    assert.equal(braces.expand('{' + Array.from({length:1000},(_,i)=>'item'+i).join(',') + '}').length,1000);
    const tree = (depth) => {let node={type:'text',value:'x'};for(let i=0;i<depth;i++)node={type:'paren',nodes:[node]};return {type:'root',nodes:[node]}};
    for (const method of ['compile','expand','stringify']) {
      guarded(() => braces[method](tree(101)));
      guarded(() => braces[method](tree(20000)));
      const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);guarded(() => braces[method](cycle));
      const first={type:'root',nodes:[]},second={type:'paren',nodes:[first]};first.nodes.push(second);guarded(() => braces[method](first));
    }
    // expand follows parent links independently of the child tree.
    const parentCycle={type:'paren',nodes:[]};parentCycle.parent=parentCycle;
    guarded(() => braces.expand({type:'root',nodes:[parentCycle]}));
    const a={type:'paren',nodes:[]},b={type:'paren',nodes:[]};a.parent=b;b.parent=a;
    guarded(() => braces.expand({type:'root',nodes:[a]}));
    const external={type:'paren',nodes:[]};let link=external;for(let i=0;i<20000;i++){link.parent={type:'paren',nodes:[]};link=link.parent;}
    guarded(() => braces.expand({type:'root',nodes:[external]}));
    console.log(JSON.stringify({comparisons,depthLimit:100,childCycles:true,parentCycles:true}));
  `,
      packageRoot,
      originalRoot ?? '',
    ],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null, 'braces regression process must finish within its deadline');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}
