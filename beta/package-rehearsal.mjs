import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, VITE_SB_LIVE_BACKEND: '1', VITE_SB_EMULATORS: '1' };
const build = spawnSync(npm, ['run', 'build'], { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status ?? 1);

process.env.VITE_SB_LIVE_BACKEND = '1';
process.env.VITE_SB_EMULATORS = '1';
await import('./package-preview.mjs');
await import('./verify-preview.mjs');
