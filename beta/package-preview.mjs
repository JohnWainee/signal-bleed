// Explicit preview packaging only; never deploy the repository root as beta output.
import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('preview-beta/', root);
for (const role of ['gm', 'play', 'present']) await access(new URL(`dist-beta/beta/${role}/index.html`, root));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Only shipped alpha assets/content; excludes source, docs, dependencies and test fixtures.
for (const path of ['index.html', 'table', 'gm', 'hawaii', 'hours', 'print', 'rules', 'cases', 'assets', 'firebase-config.js', 'sw.js', 'manifest.json']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
await cp(new URL('dist-beta/', root), output, { recursive: true });
// Absolute redirect preserves every relative dependency of the existing reference.
await mkdir(new URL('reference/gm/', output), { recursive: true });
await writeFile(new URL('reference/gm/index.html', output), '<!doctype html><html lang="en"><meta charset="utf-8"><title>GM reference</title><meta http-equiv="refresh" content="0;url=/gm/"><a href="/gm/">Open GM reference</a></html>');
const mode = process.env.VITE_SB_EMULATORS === '1' ? 'Emulator rehearsal' : process.env.VITE_SB_LIVE_BACKEND === '1' ? 'Live-backend canary' : 'Fixture';
console.log(`${mode} preview packaged at ${fileURLToPath(output)}. No deployment performed.`);
