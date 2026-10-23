import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { put } from './files.js';
export function writeStackDocumentation(root: string, registry: ResolvedStackRegistry): void {
  const sections = registry.items.map(
    (item) =>
      `## ${item.name}\n\n${item.description}.\n\nTargets: ${item.targets.join(', ')}.\n\n${item.environment.length ? 'Environment: ' + item.environment.join(', ') + '.\n\n' : ''}${item.setup ? 'Setup: ' + item.setup.resources.join('; ') + '.\n\nVerify: ' + item.setup.verify.join('; ') + '.\n' : ''}`,
  );
  put(
    root,
    'docs/stack.md',
    '# Application stack\n\nEvery application uses Expo, Hono, Drizzle/D1 and private R2. Better Auth and shared styling are included supporting foundations. Stripe and RevenueCat are optional additions.\n\nInit generates source and configuration only. Cloud provisioning, secrets, database migrations and deployment are explicit operations.\n\n' +
      sections.join('\n'),
  );
}
