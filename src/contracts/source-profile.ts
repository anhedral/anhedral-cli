// Shared by trusted Worker source tools and native checkpoint inventory.
export const INVENTORY_PROFILE = "anhedral-vinext-source-v2";
export const excludedSource =
  /(?:^|\/)(?:node_modules|\.git|\.anhedral|\.next|\.turbo|\.wrangler|dist|build)(?:\/|$)/;
export const generatedSource =
  /^(?:apps\/mobile\/(?:\.expo|\.output)(?:\/|$)|apps\/api\/worker-configuration\.d\.ts$|apps\/web\/\.(?:void|open-next)(?:\/|$)|apps\/web\/\.void-wrangler\.jsonc$|apps\/web\/(?:next-env\.d\.ts|tsconfig\.tsbuildinfo)$)/;
export const secretSource = /(?:^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*)(?:\/|$)/;
