import type { Command } from 'commander';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, rename, mkdtemp, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { createClient } from '@workspace/api-client';
import { currentUser, signIn, signOut } from '@workspace/api-client/session';

export function registerSession(program: Command) {
  function context() {
    const configured = program.opts<{ apiUrl?: string }>().apiUrl;
    if (!configured) throw Error('Set --api-url or API_ORIGIN');
    const url = new URL(configured);
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      throw Error('Use HTTPS or loopback for account access');
    const directory = path.join(homedir(), '.config', program.name(), 'sessions');
    const file = path.join(directory, createHash('sha256').update(url.origin).digest('hex'));
    const token = async () => {
      try {
        return await readFile(file, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      }
    };
    return { request: createClient(url.origin, token), directory, file };
  }
  program
    .command('login')
    .requiredOption('--email <email>')
    .description('Sign in with a password supplied on stdin')
    .action(async ({ email }: { email: string }) => {
      if (process.stdin.isTTY) throw Error('Supply the password on stdin');
      let password = '';
      process.stdin.setEncoding('utf8');
      for await (const part of process.stdin) {
        password += part;
        if (password.length > 4096) throw Error('Password input too long');
      }
      const { request, directory, file } = context();
      await signIn(request, email, password.replace(/\r?\n$/, ''), async (token) => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await chmod(directory, 0o700);
        const temp = await mkdtemp(path.join(directory, '.session-'));
        try {
          const draft = path.join(temp, 'token');
          await writeFile(draft, token, { mode: 0o600, flag: 'wx' });
          await rename(draft, file);
        } finally {
          await rm(temp, { recursive: true, force: true });
        }
      });
    });
  program.command('whoami').action(async () => {
    const { request } = context();
    console.log((await currentUser(request)) ?? 'Signed out');
  });
  program.command('logout').action(async () => {
    const { request, file } = context();
    await signOut(request, () => rm(file, { force: true }));
  });
}
