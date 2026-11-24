import type { Command } from 'commander';
import { createClient } from '@workspace/api-client';

export function registerApi(program: Command) {
  program.option('--api-url <origin>', 'Application API origin', process.env.API_ORIGIN);
  program
    .command('health')
    .description('Check API connectivity')
    .action(async () => {
      const origin = program.opts<{ apiUrl?: string }>().apiUrl;
      if (!origin) throw Error('Set --api-url or API_ORIGIN');
      const response = await createClient(origin)('/api/health');
      if (!response.ok) throw Error('API unavailable');
      console.log(await response.text());
    });
}
