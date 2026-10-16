import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
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
