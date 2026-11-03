/** The Anhedral Stack: one web foundation with progressive backend, storage and payments. */
export { scaffoldLaunchProject as scaffoldAnhedralStack } from './launch.js';
export type { LaunchOptions as AnhedralStackOptions } from './launch.js';
export { parseAnhedralStackOptions as parseInitOptions } from './launch.js';
/** @deprecated Retained SDK compatibility. Use scaffoldAnhedralStack and parseInitOptions. */
export {
  parseStandardOptions,
  scaffoldStandardProject,
  STANDARD_PRODUCTS,
  STANDARD_USAGE,
} from './standard.js';
/** @deprecated Retained SDK compatibility. Use AnhedralStackOptions for new apps. */
export type { StandardOptions, StandardProduct, StandardRunner } from './standard.js';
export { GENERATOR_VERSION } from './version.js';
