import { resourceName } from '../render.js';
import type { RecipeContext } from '../registry/types.js';
import { workerConfig, worker } from './files.js';
export function scaffoldRealtime({ root, options }: RecipeContext): void {
  worker(
    root,
    'realtime',
    {
      ...workerConfig(resourceName(options.name, 'realtime')),
      durable_objects: { bindings: [{ name: 'ROOMS', class_name: 'Room' }] },
      migrations: [{ tag: 'v1', new_sqlite_classes: ['Room'] }],
    },
    `import { DurableObject } from 'cloudflare:workers';
export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(sender: WebSocket, message: string | ArrayBuffer) {
    const size = typeof message === 'string'
      ? new TextEncoder().encode(message).byteLength
      : message.byteLength;
    if (size > 16384) {
      sender.close(1009, 'Message too large');
      return;
    }
    this.#broadcastToPeers(sender, message);
  }

  #broadcastToPeers(sender: WebSocket, message: string | ArrayBuffer) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== sender) socket.send(message);
    }
  }
}
export default {
  async fetch(): Promise<Response> {
    // Authenticate and authorize room membership, then forward to env.ROOMS.getByName(room).fetch(request).
    // Use short-lived single-use tickets for browser WebSockets. Never expose a long-lived service secret.
    return new Response('Configure room authorization before enabling connections', { status: 501 });
  },
};
`,
  );
}

export function scaffoldQueues({ root, options }: RecipeContext): void {
  worker(
    root,
    'jobs',
    {
      ...workerConfig(resourceName(options.name, 'jobs')),
      queues: {
        producers: [{ binding: 'JOBS', queue: resourceName(options.name, 'jobs') }],
        consumers: [
          {
            queue: resourceName(options.name, 'jobs'),
            max_batch_size: 10,
            max_retries: 3,
            dead_letter_queue: resourceName(options.name, 'jobs-dlq'),
          },
        ],
      },
    },
    `export default {
  async queue(batch: MessageBatch<unknown>): Promise<void> {
    for (const message of batch.messages) {
      // Add transactional idempotency and product processing before acknowledging.
      console.error('Job handler requires product implementation', message.id);
      message.retry({ delaySeconds: 60 });
    }
  },
};
`,
  );
}

export function scaffoldCron({ root, options }: RecipeContext): void {
  worker(
    root,
    'scheduled',
    {
      ...workerConfig(resourceName(options.name, 'scheduled')),
      triggers: { crons: ['0 * * * *'] },
    },
    `export default {
  async scheduled(controller: ScheduledController): Promise<void> {
    // Define a product schedule, idempotency key, overlap policy, and failure alerts before release.
    console.log('Scheduled trigger', controller.scheduledTime);
  },
};
`,
  );
}

export function scaffoldWorkflows({ root, options }: RecipeContext): void {
  worker(
    root,
    'workflows',
    {
      ...workerConfig(resourceName(options.name, 'workflows')),
      workflows: [
        {
          name: resourceName(options.name, 'workflow'),
          binding: 'WORKFLOW',
          class_name: 'ApplicationWorkflow',
        },
      ],
    },
    `import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
export class ApplicationWorkflow extends WorkflowEntrypoint<Env, { operationId: string }> {
  async run(event: WorkflowEvent<{ operationId: string }>, step: WorkflowStep) {
    return step.do('validate', { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' } }, async () => {
      if (typeof event.payload.operationId !== 'string' || !event.payload.operationId) {
        throw new Error('operationId required');
      }
      return { operationId: event.payload.operationId };
    });
  }
}
export default {
  async fetch() {
    return new Response('Use an authorized server binding to create workflows', { status: 403 });
  },
};
`,
  );
}
