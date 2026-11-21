import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' }, auxiliaryWorkers: command === 'serve' ? [{ configPath: '../api/wrangler.jsonc' }] : [], persistState: { path: fileURLToPath(new URL('../api/.wrangler/state', import.meta.url)) }, remoteBindings: false }),
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
  ],
}));
