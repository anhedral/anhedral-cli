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
    '# Application stack\n\nEvery application uses Next.js App Router/OpenNext for web, Expo for iOS/Android, Hono, Drizzle/D1 and private R2. Shared contracts, styling and native shadcn UI are included. Consumers implement application features, identity and integrations.\n\nInit generates source and configuration only. Consumers own cloud provisioning, secrets, migrations and deployment.\n\n' +
      sections.join('\n'),
  );
}
