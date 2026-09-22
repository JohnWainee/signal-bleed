import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
export default defineConfig({
  root,
  appType: 'mpa',
  publicDir: false,
  server: { host: '127.0.0.1' },
  build: {
    outDir: 'dist-beta',
    emptyOutDir: true,
    sourcemap: false,
    target: ['es2022', 'safari16.4'],
    rolldownOptions: {
      input: Object.fromEntries(['gm', 'play', 'present'].map(role =>
        [role, fileURLToPath(new URL(`${role}/index.html`, import.meta.url))]))
    }
  }
});
