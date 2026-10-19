import { config } from "@workspace/eslint-config/react-internal";
export default [...config, { files: ["**/*.{ts,tsx,cts}"], languageOptions: { parserOptions: { babelOptions: { babelrc: false, configFile: false, parserOpts: { plugins: ["jsx", "typescript"] } } } }, rules: { "no-undef": "off", "no-unused-vars": "off" } }];
