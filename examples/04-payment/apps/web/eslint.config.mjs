import { config } from '@workspace/eslint-config/react-internal';
export default [...config, { ignores: ['dist/**', '.wrangler/**', 'src/routeTree.gen.ts', 'worker-configuration.d.ts'] }];
