import { SERVICE_TOOL_ACTIONS } from '../../../../src/service-model.ts';
import path from 'node:path';
import {
  serviceOperation,
  type ServiceRequestFactory,
} from '../../../../src/service-operations.ts';
import { ServiceDeletionStore } from '../../../../src/service-deletion.ts';
import {
  serviceArgumentsSchema,
  serviceResponseSchema,
  type ServiceTool,
  type ServiceArguments,
  type ServiceResponse,
} from '../shared/service-actions.ts';
import type { ProjectStore } from './store.ts';
export type { ServiceRequestFactory } from '../../../../src/service-operations.ts';
export class ProjectServices {
  readonly deletion: ServiceDeletionStore;
  constructor(
    readonly store: ProjectStore,
    readonly factory?: ServiceRequestFactory,
  ) {
    this.deletion = new ServiceDeletionStore(path.join(store.directory, 'service-confirmations'));
  }
  async call(tool: ServiceTool, raw: ServiceArguments): Promise<ServiceResponse> {
    const args = serviceArgumentsSchema.parse(raw);
    const { directory: root } = this.store.context(args.id);
    return serviceResponseSchema.parse(
      await serviceOperation(root, SERVICE_TOOL_ACTIONS[tool], args.key, args, {
        request: this.factory,
        deletions: this.deletion,
      }),
    );
  }
}
