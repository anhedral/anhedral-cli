import path from 'node:path';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  renderer: {
    root: 'ui',
    server: { host: '127.0.0.1', port: 1420, strictPort: true },
    build: { minify: true, rolldownOptions: { input: path.resolve('ui/index.html') } },
  },
});
