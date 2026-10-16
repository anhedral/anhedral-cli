import { homedir } from 'node:os';
import path from 'node:path';
import { ProjectStore } from './project-catalog.js';
export function catalogDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.ANHEDRAL_PLUGIN_DATA ?? path.join(homedir(), '.local', 'share', 'anhedral', 'projects')
  );
}
/** Every successful CLI init records a local app unless explicitly disabled.
 * Registration failure never undoes generated source. */
export function registerGeneratedProject(root: string, env: NodeJS.ProcessEnv = process.env) {
  const directory = catalogDirectory(env);
  if (env.ANHEDRAL_DISABLE_CATALOG === '1') return { state: 'not-enabled' as const };
  try {
    return { state: 'registered' as const, id: new ProjectStore(directory).register(root) };
  } catch {
    return {
      state: 'pending' as const,
      nextAction:
        'Project generated. Catalog registration could not complete; refresh or register the source after restoring catalog access.',
    };
  }
}
