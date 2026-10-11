// Exact versions owned by the registry recipes and native app generators.
export interface DependencyGroup {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

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
    eslint: '10.0.3',
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

export const PACKAGE_MANAGER = 'pnpm@10.34.5';

// renovate: datasource=npm depName=eas-cli
export const EAS_CLI_VERSION = '21.0.1';

// renovate: datasource=npm depName=shadcn
export const SHADCN_VERSION = '4.21.4';

export const STACK_DEPENDENCIES = {
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
  // renovate: datasource=npm depName=stripe
  stripe: '20.4.1',
  // renovate: datasource=npm depName=posthog-node
  'posthog-node': '5.55.2',
} as const;
