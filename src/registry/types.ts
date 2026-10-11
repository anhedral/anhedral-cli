import type { StandardProduct } from '../stack-registry.js';
import type { Json } from '../scaffold/files.js';

export type { StandardProduct } from '../stack-registry.js';
export type Hosting = 'cloudflare' | 'vercel';
export interface StandardOptions {
  root: string;
  name: string;
  products: StandardProduct[];
  hosting: Hosting;
  skipInstall: boolean;
  dryRun: boolean;
  json: boolean;
  initializeGit: boolean;
}
export type StandardRunner = (command: string, args: string[], cwd: string) => void;
export interface StackSelection {
  conflicts?: readonly string[];
  requiresAny?: readonly string[];
  requiresAll?: readonly string[];
}
export interface SetupRequirements {
  purpose: string;
  tools: readonly string[];
  access: readonly string[];
  credentials: readonly string[];
  resources: readonly string[];
  verify: readonly string[];
}
export interface RecipeContext {
  root: string;
  options: StandardOptions;
  runtimeApp: 'api' | 'web';
  bindings: Json;
  has: (product: string) => boolean;
}
export type Recipe = (context: RecipeContext) => void | Promise<void>;
export interface PackageRecipe {
  name: string;
  source: string;
  dependencies: Record<string, string>;
}
export interface StackRegistryItem {
  name: string;
  version: string;
  type: 'foundation' | 'application' | 'service' | 'package' | 'integration';
  description: string;
  registryDependencies: readonly string[];
  targets: readonly string[];
  selection: StackSelection;
  installer: 'bootstrap' | 'recipe' | 'configuration';
  runtime?: 'server' | 'worker' | 'optional-worker';
  environment: readonly string[];
  setup?: SetupRequirements;
  package?: PackageRecipe;
  bindings?: Json;
}
export interface ItemDefinition extends Omit<StackRegistryItem, 'bindings'> {
  install?: Recipe;
  configure?: (context: RecipeContext) => Json;
  resolveTargets?: (context: RecipeContext) => string[];
  resolvePackage?: (context: RecipeContext, recipe: PackageRecipe) => PackageRecipe;
  resolveDependencies?: (context: RecipeContext) => string[];
  fallbackDependency?: string;
}
