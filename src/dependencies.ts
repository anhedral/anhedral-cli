// Exact versions owned by registry recipes, generators and provider tooling.
export interface DependencyGroup {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// renovate: datasource=npm depName=eslint
export const NATIVE_ESLINT_VERSION = '10.0.3';

export const DESKTOP_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=react
    react: '19.2.7',
    // renovate: datasource=npm depName=react-dom
    'react-dom': '19.2.7',
    // renovate: datasource=npm depName=clsx
    clsx: '2.1.1',
    // renovate: datasource=npm depName=tailwind-merge
    'tailwind-merge': '3.4.0',
  },
  devDependencies: {
    // renovate: datasource=npm depName=@tailwindcss/postcss
    '@tailwindcss/postcss': '4.1.18',
    // renovate: datasource=npm depName=@vitejs/plugin-react
    '@vitejs/plugin-react': '5.2.0',
    // renovate: datasource=npm depName=@types/node
    '@types/node': '20.19.43',
    // renovate: datasource=npm depName=@types/react
    '@types/react': '19.2.7',
    // renovate: datasource=npm depName=@types/react-dom
    '@types/react-dom': '19.2.3',
    // renovate: datasource=npm depName=electron
    electron: '43.7.8',
    // renovate: datasource=npm depName=electron-builder
    'electron-builder': '26.15.3',
    eslint: NATIVE_ESLINT_VERSION,
    // renovate: datasource=npm depName=tailwindcss
    tailwindcss: '4.1.18',
    // renovate: datasource=npm depName=postcss
    postcss: '8.5.23',
    // renovate: datasource=npm depName=typescript
    typescript: '5.9.3',
    // renovate: datasource=npm depName=vite
    vite: '7.3.6',
  },
};

export const EXTENSION_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=react
    react: '19.2.7',
    // renovate: datasource=npm depName=react-dom
    'react-dom': '19.2.7',
    // renovate: datasource=npm depName=clsx
    clsx: '2.1.1',
    // renovate: datasource=npm depName=tailwind-merge
    'tailwind-merge': '3.4.0',
  },
  devDependencies: {
    // renovate: datasource=npm depName=@types/chrome
    '@types/chrome': '0.1.9',
    // renovate: datasource=npm depName=@types/react
    '@types/react': '19.2.7',
    // renovate: datasource=npm depName=@types/react-dom
    '@types/react-dom': '19.2.3',
    // renovate: datasource=npm depName=@wxt-dev/module-react
    '@wxt-dev/module-react': '1.2.2',
    // renovate: datasource=npm depName=autoprefixer
    autoprefixer: '10.4.23',
    // renovate: datasource=npm depName=postcss
    postcss: '8.5.23',
    // renovate: datasource=npm depName=tailwindcss
    tailwindcss: '3.4.19',
    // renovate: datasource=npm depName=typescript
    typescript: '5.9.3',
    // renovate: datasource=npm depName=wxt
    wxt: '0.20.27',
  },
};

export const MOBILE_APP_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=@rn-primitives/portal
    '@rn-primitives/portal': '1.5.2',
    // renovate: datasource=npm depName=clsx
    clsx: '2.1.1',
    // renovate: datasource=npm depName=expo
    expo: '57.0.8',
    // renovate: datasource=npm depName=expo-dev-client
    'expo-dev-client': '57.0.20',
    // renovate: datasource=npm depName=expo-linking
    'expo-linking': '57.0.4',
    // renovate: datasource=npm depName=expo-router
    'expo-router': '57.0.8',
    // renovate: datasource=npm depName=expo-status-bar
    'expo-status-bar': '57.0.1',
    // renovate: datasource=npm depName=react
    react: '19.2.3',
    // renovate: datasource=npm depName=react-dom
    'react-dom': '19.2.3',
    // renovate: datasource=npm depName=react-native
    'react-native': '0.86.0',
    // renovate: datasource=npm depName=react-native-reanimated
    'react-native-reanimated': '4.5.0',
    // renovate: datasource=npm depName=react-native-safe-area-context
    'react-native-safe-area-context': '5.7.0',
    // renovate: datasource=npm depName=react-native-screens
    'react-native-screens': '4.26.2',
    // renovate: datasource=npm depName=react-native-worklets
    'react-native-worklets': '0.10.0',
    // renovate: datasource=npm depName=react-native-web
    'react-native-web': '0.21.2',
    // renovate: datasource=npm depName=tailwind-merge
    'tailwind-merge': '3.5.0',
    // renovate: datasource=npm depName=tailwindcss-animate
    'tailwindcss-animate': '1.0.7',
  },
  devDependencies: {
    // renovate: datasource=npm depName=@babel/core
    '@babel/core': '7.29.7',
    // renovate: datasource=npm depName=babel-preset-expo
    'babel-preset-expo': '57.0.14',
    // renovate: datasource=npm depName=@testing-library/dom
    '@testing-library/dom': '10.4.1',
    // renovate: datasource=npm depName=@react-native/metro-config
    '@react-native/metro-config': '0.86.0',
    // renovate: datasource=npm depName=@types/react
    '@types/react': '19.2.10',
    // renovate: datasource=npm depName=@types/react-dom
    '@types/react-dom': '19.2.3',
    // renovate: datasource=npm depName=typescript
    typescript: '6.0.3',
  },
};

export const MOBILE_NATIVEWIND_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=nativewind
    nativewind: '4.2.6',
    // renovate: datasource=npm depName=react-native-css-interop
    'react-native-css-interop': '0.2.6',
    // renovate: datasource=npm depName=tailwindcss
    tailwindcss: '3.4.19',
  },
};

export const WORKSPACE_NODE_ENGINE = '^22.13.0 || >=24.0.0';

export const PACKAGE_MANAGER = 'pnpm@10.34.5';

// renovate: datasource=npm depName=eas-cli
export const EAS_CLI_VERSION = '21.0.1';

// renovate: datasource=npm depName=vercel
export const VERCEL_CLI_VERSION = '62.7.0';

// renovate: datasource=npm depName=shadcn
export const SHADCN_VERSION = '4.21.4';

// renovate: datasource=npm depName=next
export const NEXT_VERCEL_VERSION = '16.4.0';
// renovate: datasource=npm depName=next
export const NEXT_OPENNEXT_VERSION = '16.3.8';

export const STACK_DEPENDENCIES = {
  // renovate: datasource=npm depName=zod
  zod: '4.6.6',
  // renovate: datasource=npm depName=@typescript-eslint/parser
  '@typescript-eslint/parser': '8.71.2',
  // renovate: datasource=npm depName=@typescript-eslint/eslint-plugin
  '@typescript-eslint/eslint-plugin': '8.71.2',
  // renovate: datasource=npm depName=@next/eslint-plugin-next
  '@next/eslint-plugin-next': '16.4.2',
  // renovate: datasource=npm depName=turbo
  turbo: '2.11.7',
  // renovate: datasource=npm depName=tsx
  tsx: '4.23.15',
  // renovate: datasource=npm depName=better-auth
  'better-auth': '1.7.7',
  // renovate: datasource=npm depName=@better-auth/expo
  '@better-auth/expo': '1.7.7',
  // renovate: datasource=npm depName=expo-secure-store
  'expo-secure-store': '57.0.4',
  // renovate: datasource=npm depName=expo-network
  'expo-network': '57.0.2',
  // renovate: datasource=npm depName=@better-auth/drizzle-adapter
  '@better-auth/drizzle-adapter': '1.7.7',
  // renovate: datasource=npm depName=@neondatabase/serverless
  '@neondatabase/serverless': '1.2.0',
  // renovate: datasource=npm depName=@neon/realtime
  '@neon/realtime': '0.1.0',
  // renovate: datasource=npm depName=@neon/realtime-drizzle
  '@neon/realtime-drizzle': '0.1.0',
  // renovate: datasource=npm depName=drizzle-orm
  'drizzle-orm': '0.45.4',
  // renovate: datasource=npm depName=@clerk/nextjs
  '@clerk/nextjs': '7.9.14',
  // renovate: datasource=npm depName=@clerk/backend
  '@clerk/backend': '3.23.2',
  // renovate: datasource=npm depName=wrangler
  wrangler: '4.149.0',
  // renovate: datasource=npm depName=typescript
  typescript: '5.9.3',
  // renovate: datasource=npm depName=@types/node
  '@types/node': '22.20.5',
  // renovate: datasource=npm depName=eslint
  eslint: '9.39.5',
  // renovate: datasource=npm depName=postcss-load-config
  'postcss-load-config': '6.0.1',
  // renovate: datasource=npm depName=@opennextjs/cloudflare
  '@opennextjs/cloudflare': '1.20.10',
  // renovate: datasource=npm depName=drizzle-kit
  'drizzle-kit': '0.31.11',
  // renovate: datasource=npm depName=hono
  hono: '4.13.13',
  // renovate: datasource=npm depName=@hono/zod-openapi
  '@hono/zod-openapi': '1.6.3',
  // renovate: datasource=npm depName=fallow
  fallow: '3.33.1',
  // renovate: datasource=npm depName=openai
  openai: '6.49.0',
  // renovate: datasource=npm depName=ai
  ai: '6.0.303',
  // renovate: datasource=npm depName=@ai-sdk/openai
  '@ai-sdk/openai': '3.0.125',
  // renovate: datasource=npm depName=resend
  resend: '6.32.1',
  // renovate: datasource=npm depName=react-native-purchases
  'react-native-purchases': '10.14.0',
  // renovate: datasource=npm depName=stripe
  stripe: '23.0.0',
  // renovate: datasource=npm depName=posthog-node
  'posthog-node': '5.55.2',
} as const;

/** Vinext's RSC/React versions form a separately verified compatibility group. */
export const VINEXT_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=vinext
    vinext: '1.1.0',
    next: NEXT_VERCEL_VERSION,
    // renovate: datasource=npm depName=react
    react: '19.2.8',
    // renovate: datasource=npm depName=react-dom
    'react-dom': '19.2.8',
    // renovate: datasource=npm depName=react-server-dom-webpack
    'react-server-dom-webpack': '19.2.8',
  },
  devDependencies: {
    // renovate: datasource=npm depName=vite
    vite: '8.3.4',
    // renovate: datasource=npm depName=@cloudflare/vite-plugin
    '@cloudflare/vite-plugin': '1.63.1',
    // renovate: datasource=npm depName=@vitejs/plugin-rsc
    '@vitejs/plugin-rsc': '0.5.36',
    // renovate: datasource=npm depName=@vitejs/plugin-react
    '@vitejs/plugin-react': '6.1.2',
    wrangler: STACK_DEPENDENCIES.wrangler,
  },
};

/** Separate HTTP and inspector ports let all selected Workers run together. */
export const WORKER_DEV_PORTS = {
  api: { http: 8787, inspector: 9231 },
  realtime: { http: 8788, inspector: 9232 },
  jobs: { http: 8789, inspector: 9233 },
  scheduled: { http: 8790, inspector: 9234 },
  workflows: { http: 8791, inspector: 9235 },
} as const;

/** Compatible security overrides are catalog pins and must be audited too. */
export const SECURITY_OVERRIDE_DEPENDENCIES = {
  // renovate: datasource=npm depName=@vitejs/plugin-react
  '@vitejs/plugin-react': '5.2.0',
  // renovate: datasource=npm depName=sharp
  sharp: '0.35.5',
  // renovate: datasource=npm depName=source-map-js
  'source-map-js': '1.2.2',
  // renovate: datasource=npm depName=shell-quote
  'shell-quote': '1.12.0',
  // renovate: datasource=npm depName=tmp
  tmp: '0.2.7',
  // renovate: datasource=npm depName=adm-zip
  'adm-zip': '0.6.1',
  // renovate: datasource=npm depName=baseline-browser-mapping
  'baseline-browser-mapping': '2.11.27',
  // renovate: datasource=npm depName=browserslist
  browserslist: '4.29.3',
  // renovate: datasource=npm depName=esbuild
  esbuild: '0.25.12',
} as const;

// Keep each compatible major independently reviewed.
// renovate: datasource=npm depName=glob
export const GLOB_10_OVERRIDE_VERSION = '10.5.0';
// renovate: datasource=npm depName=glob
export const GLOB_11_OVERRIDE_VERSION = '11.1.0';
// renovate: datasource=npm depName=brace-expansion
export const BRACE_EXPANSION_1_OVERRIDE_VERSION = '1.1.21';
// renovate: datasource=npm depName=brace-expansion
export const BRACE_EXPANSION_2_OVERRIDE_VERSION = '2.1.7';
// No blanket 3.x override: GHSA-3jxr-9vmj-r5cp lists no repaired 3.x
// release, and supported locked profiles do not consume that major.
// renovate: datasource=npm depName=brace-expansion
export const BRACE_EXPANSION_5_OVERRIDE_VERSION = '5.0.12';
