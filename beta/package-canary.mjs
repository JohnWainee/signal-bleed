import { spawnSync } from 'node:child_process';

const siteKey = process.env.VITE_SB_APPCHECK_SITE_KEY;
if (!siteKey || siteKey.length < 20) {
  throw new Error('VITE_SB_APPCHECK_SITE_KEY is required to package a live-backend canary');
}
process.env.VITE_SB_LIVE_BACKEND = '1';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npm, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_SB_LIVE_BACKEND: '1' },
});
if (build.status !== 0) process.exit(build.status ?? 1);

await import('./package-preview.mjs');
await import('./verify-preview.mjs');
