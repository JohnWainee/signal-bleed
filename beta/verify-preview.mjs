import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const root = new URL('../preview-beta/', import.meta.url);
const required = [
  'index.html', 'gm/index.html', 'table/index.html', 'hawaii/index.html',
  'beta/gm/index.html', 'beta/play/index.html', 'beta/present/index.html',
  'firebase-config.js', 'sw.js', 'manifest.json', 'reference/gm/index.html',
];
for (const path of required) await access(new URL(path, root));

for (const path of ['AGENTS.md', 'HANDOFF.md', 'package.json', 'firebase.rules.json', 'beta/src', 'beta/tests', 'node_modules', '.git']) {
  await assert.rejects(access(new URL(path, root)), undefined, `${path} must not be present in the preview artifact`);
}

const assets = await readdir(new URL('assets/', root));
const scripts = assets.filter(name => name.endsWith('.js'));
assert.ok(scripts.length >= 1, 'preview contains no built JavaScript');
const javascript = (await Promise.all(scripts.map(name => readFile(new URL(`assets/${name}`, root), 'utf8')))).join('\n');
if (process.env.VITE_SB_LIVE_BACKEND === '1') {
  assert.match(javascript, /betaRoomCommand/, 'live canary bundle does not contain the Firebase command adapter');
  assert.match(javascript, /betaRoomStatus/, 'live canary bundle does not contain the room status callable');
}

for (const role of ['gm', 'play', 'present']) {
  const html = await readFile(new URL(`beta/${role}/index.html`, root), 'utf8');
  assert.match(html, /\/assets\/.+\.js/, `${role} route does not reference a built JavaScript asset`);
  assert.match(html, /\/assets\/.+\.css/, `${role} route does not reference a built stylesheet`);
}

console.log(`Preview artifact verified: ${required.length} required paths, ${scripts.length} JavaScript asset(s), no repository tooling.`);
