const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = (context, name, platform) =>
  name === '@workspace/styling'
    ? { type: 'sourceFile', filePath: path.join(__dirname, '.generated/styling/src/index.ts') }
    : context.resolveRequest(context, name, platform);
module.exports = config;
