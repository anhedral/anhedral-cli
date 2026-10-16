import { defineConfig } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } }),
    {
      name: 'anhedral:vinext-server-modules',
      apply: 'build',
      enforce: 'post',
      outputOptions(output) {
        if (this.environment.name === 'rsc') {
          return { ...output, chunkFileNames: '[name]-[hash].js' };
        }
      },
    },
  ],
});
