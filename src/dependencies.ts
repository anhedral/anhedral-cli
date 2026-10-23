// Exact versions owned by registry recipes, generators and provider tooling.
export interface DependencyGroup {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// renovate: datasource=npm depName=eslint
export const NATIVE_ESLINT_VERSION = '10.0.3';

export const MOBILE_APP_DEPENDENCIES: DependencyGroup = {
  dependencies: {
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
    // renovate: datasource=npm depName=typescript
    typescript: '6.0.3',
  },
};

export const WEB_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=next
    next: '16.4.2',
    // renovate: datasource=npm depName=react
    react: '19.2.3',
    // renovate: datasource=npm depName=react-dom
    'react-dom': '19.2.3',
    // renovate: datasource=npm depName=better-auth
    'better-auth': '1.7.7',
    // renovate: datasource=npm depName=server-only
    'server-only': '0.0.1',
    // renovate: datasource=npm depName=@base-ui/react
    '@base-ui/react': '1.9.0',
    // renovate: datasource=npm depName=class-variance-authority
    'class-variance-authority': '0.7.1',
    // renovate: datasource=npm depName=clsx
    clsx: '2.1.1',
    // renovate: datasource=npm depName=tailwind-merge
    'tailwind-merge': '3.5.0',
    // renovate: datasource=npm depName=@opennextjs/cloudflare
    '@opennextjs/cloudflare': '1.20.12',
  },
  devDependencies: {
    // renovate: datasource=npm depName=tailwindcss
    tailwindcss: '4.3.3',
    // renovate: datasource=npm depName=@tailwindcss/postcss
    '@tailwindcss/postcss': '4.3.3',
    // renovate: datasource=npm depName=eslint-config-next
    'eslint-config-next': '16.4.2',
    // renovate: datasource=npm depName=eslint
    eslint: '9.39.5',
    // renovate: datasource=npm depName=typescript
    typescript: '5.9.3',
    // renovate: datasource=npm depName=@types/node
    '@types/node': '22.20.5',
    // renovate: datasource=npm depName=@types/react
    '@types/react': '19.2.10',
    // renovate: datasource=npm depName=@types/react-dom
    '@types/react-dom': '19.2.3',
    // renovate: datasource=npm depName=wrangler
    wrangler: '4.151.0',
  },
};

export const NATIVE_UI_DEPENDENCIES: DependencyGroup = {
  dependencies: {
    // renovate: datasource=npm depName=@react-native-async-storage/async-storage
    '@react-native-async-storage/async-storage': '2.2.0',
    // renovate: datasource=npm depName=expo-system-ui
    'expo-system-ui': '57.0.3',
  },
};

// renovate: datasource=npm depName=glob
export const OPENNEXT_GLOB_VERSION = '10.5.0';

export const WORKSPACE_NODE_ENGINE = '^22.13.0 || >=24.0.0';

export const PACKAGE_MANAGER = 'pnpm@10.34.5';

// renovate: datasource=npm depName=eas-cli
export const EAS_CLI_VERSION = '21.0.1';

export const STACK_DEPENDENCIES = {
  // renovate: datasource=npm depName=zod
  zod: '4.6.6',
  // renovate: datasource=npm depName=@typescript-eslint/parser
  '@typescript-eslint/parser': '8.71.2',
  // renovate: datasource=npm depName=@typescript-eslint/eslint-plugin
  '@typescript-eslint/eslint-plugin': '8.71.2',
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
  // renovate: datasource=npm depName=drizzle-orm
  'drizzle-orm': '0.45.4',
  // renovate: datasource=npm depName=wrangler
  wrangler: '4.151.0',
  // renovate: datasource=npm depName=typescript
  typescript: '5.9.3',
  // renovate: datasource=npm depName=@types/node
  '@types/node': '22.20.5',
  // renovate: datasource=npm depName=eslint
  eslint: '9.39.5',
  // renovate: datasource=npm depName=drizzle-kit
  'drizzle-kit': '0.31.11',
  // renovate: datasource=npm depName=hono
  hono: '4.13.13',
  // renovate: datasource=npm depName=@hono/zod-openapi
  '@hono/zod-openapi': '1.6.3',
  // renovate: datasource=npm depName=fallow
  fallow: '3.33.1',
  // renovate: datasource=npm depName=react-native-purchases
  'react-native-purchases': '10.14.0',
  // renovate: datasource=npm depName=stripe
  stripe: '23.0.0',
} as const;

/** Separate HTTP and inspector ports let all selected Workers run together. */
export const WORKER_DEV_PORTS = {
  api: { http: 8787, inspector: 9231 },
} as const;
