import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const run = promisify(execFile);
export default function anhedralHandoffs(pi: ExtensionAPI) {
  let needsBrief = true;
  pi.on('session_start', async () => {
    needsBrief = true;
  });
  pi.on('before_agent_start', async (_event, ctx) => {
    if (!needsBrief) return;
    const { stdout } = await run(
      'anhedral-handoff',
      ['start', 'pi', ctx.sessionManager.getSessionId()],
      { timeout: 30000, cwd: ctx.cwd },
    );
    if (!stdout.trim()) return;
    needsBrief = false;
    return {
      message: {
        customType: 'anhedral-handoff',
        content: JSON.parse(stdout).hookSpecificOutput.additionalContext,
        display: false,
      },
    };
  });
  pi.on('agent_settled', async (_event, ctx) => {
    await run('anhedral-handoff', ['stop', 'pi', ctx.sessionManager.getSessionId()], {
      timeout: 30000,
      cwd: ctx.cwd,
    });
  });
}
