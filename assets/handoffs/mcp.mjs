// Local hosts use newline-delimited JSON-RPC. Platform remains the authentication and tool authority.
import { readPrivate } from '../../dist/platform/state.js';
import { readSourceBounded } from '../../dist/contracts/source-bundle.js';
import { z } from 'zod';

const credential = z.object({
  url: z.url(),
  token: z.string().regex(/^amcp_[0-9a-f]{64}$/),
  principalId: z.uuid(),
  teamId: z.uuid(),
});
export async function serveMcp(actor, project) {
  const file = process.env.ANHEDRAL_HANDOFF_MCP_FILE;
  if (!file) throw Error('Run reports connect and select its credential file');
  const linked = actor.context.project;
  const url = actor.origin + '/api/cli/v1/projects/' + project + '/mcp';
  let remaining = Buffer.alloc(0),
    legacyVersion;
  for await (const chunk of process.stdin) {
    remaining = Buffer.concat([remaining, chunk]);
    let end;
    while ((end = remaining.indexOf(10)) >= 0) {
      if (end > 1048576) throw Error('MCP request too large');
      const line = remaining.subarray(0, end).toString('utf8');
      remaining = remaining.subarray(end + 1);
      if (!line.trim()) continue;
      let request;
      try {
        request = JSON.parse(line);
        const saved = credential.parse(await readPrivate(file));
        if (
          saved.url !== url ||
          saved.teamId !== linked.teamId ||
          saved.principalId !== actor.principalId
        )
          throw Error('Connection changed');
        const version =
          request.params?._meta?.['io.modelcontextprotocol/protocolVersion'] ?? legacyVersion;
        const headers = {
          authorization: 'Bearer ' + saved.token,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        };
        if (version) headers['MCP-Protocol-Version'] = version;
        if (version === '2026-07-28') {
          headers['Mcp-Method'] = request.method;
          if (request.method === 'tools/call') headers['Mcp-Name'] = request.params.name;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: line,
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
        });
        if (request.id === undefined) continue;
        const json = JSON.parse(
          new TextDecoder().decode(await readSourceBounded(res.body, 4194304)),
        );
        if (json.jsonrpc !== '2.0' || json.id !== request.id)
          throw Error('Invalid server response');
        if (request.method === 'initialize') legacyVersion = json.result?.protocolVersion;
        process.stdout.write(JSON.stringify(json) + '\n');
      } catch {
        if (request?.id !== undefined || !request)
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: request?.id ?? null,
              error: {
                code: -32000,
                message:
                  'Anhedral MCP connection unavailable. Check sign-in and the linked project.',
              },
            }) + '\n',
          );
      }
    }
    if (remaining.length > 1048576) throw Error('MCP request too large');
  }
}
