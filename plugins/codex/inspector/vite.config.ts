import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'web',
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 1000000,
    cssCodeSplit: false,
    sourcemap: false,
  },
});
