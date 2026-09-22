// Guard the active Hawaiʻi migration against restoring retired setting content.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Script, runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const root = process.cwd();
const dirs = ['rules', 'beta', 'cases', 'gm', 'table', 'print', 'hours', 'hawaii'];
const paths = ['README.md', 'index.html'];
function collect(dir) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (/\.(md|html|json)$/.test(p)) paths.push(p);
  }
}
dirs.forEach(collect);
const retired = /Port Vespers|The Hours|eleven islands|eight islands were named|Calder.Vaughn|The Unnumbered|Sounding Company|Nobody was ever from here/i;
for (const p of paths) {
  const s = readFileSync(join(root,p), 'utf8');
  assert.ok(!retired.test(s), `Retired setting content in ${p}`);
  if (p.endsWith('.html')) {
    for (const match of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      if (match[1].trim()) new Script(match[1], { filename: p });
    }
  }
}
const bible = readFileSync(join(root, 'rules/hawaii-setting-bible.md'), 'utf8');
for (const term of ['September 2026','September Compression','Emergency Republic','Branch Event One','Observer Trials','2030','JIITG']) assert.ok(bible.includes(term), `Missing timeline anchor: ${term}`);
const table = readFileSync(join(root,'table/index.html'),'utf8');
// Evaluate only repository-authored data declarations, never full browser code.
const bands = runInNewContext('(' + table.match(/const D100=([\s\S]*?);\n/)[1] + ')');
let next=1;
for (const band of bands) {
  assert.equal(band.lo,next); assert.ok(band.hi>=band.lo); assert.ok(band.opts.length);
  next=band.hi+1;
  if (band.p==='keypad') for(const o of band.opts) assert.match(o.code,/^\d{4}$/);
  if (band.p==='sound') for(const o of band.opts) assert.ok(Number.isFinite(o.target));
}
assert.equal(next,101);
const books=runInNewContext('('+table.match(/const BOOKS=(\{[\s\S]*?\});\nconst GM_LENS/)[1]+')');
assert.equal(Object.keys(books).length,7);
assert.equal(readFileSync(join(root,'print/hawaii.html'),'utf8'),readFileSync(join(root,'print/hours.html'),'utf8'));
assert.equal(readFileSync(join(root,'print/hawaii.html'),'utf8'),readFileSync(join(root,'print/vespers.html'),'utf8'));
assert.equal(readFileSync(join(root,'hawaii/index.html'),'utf8'),readFileSync(join(root,'hours/index.html'),'utf8'));
console.log(`ok Hawaiʻi setting: ${paths.length} active files; inline JS; timeline; d100 coverage; seven playbooks; compatibility copies`);
