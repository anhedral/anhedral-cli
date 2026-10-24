import { fileURLToPath } from 'node:url';
import projectMark from '../../distribution/assets/anhedral-mark.svg';
import projectMarkDark from '../../distribution/assets/anhedral-mark-dark.svg';
import { GENERATOR_VERSION } from '../../../../src/version.ts';
import { McpServer } from '@modelcontextprotocol/server';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { serviceToolResult } from './service-results.ts';
import { ProjectServices } from './services.ts';
import {
  SERVICE_TOOLS,
  PRIVATE_SERVICE_TOOLS,
  serviceArgumentsSchema,
  serviceResponseSchema,
} from '../shared/service-actions.ts';
import { serviceInventory } from '../shared/services.ts';
import { serviceInventorySchema } from '../shared/service-schema.ts';
import { dashboardSchema } from '../shared/schema.ts';
import { CatalogError, catalogFailure, type ProjectStore } from './store.ts';
import type { DashboardTool, ToolArguments } from '../shared/model.ts';
function operationError(error: unknown) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(catalogFailure(error)),
      },
    ],
  };
}
const UI_RESOURCE = 'ui://anhedral/projects/v1.html';
const serviceDescriptions: Record<(typeof SERVICE_TOOLS)[number], string> = {
  refresh_service:
    'Read current provider status for one selected service. Resource existence is distinct from application health. Use a catalog project id and exact service key from get_project_services.',
  get_service_metrics:
    'Read aggregate analytics for one supported service over 1, 24 or 168 hours. D1 uses complete UTC days; its supported windows are 24 or 168 hours. Use get_project_services for the project service key; no traffic is not proof of health.',
  list_service_tables:
    'List database tables or available KV/R2 metadata views for one selected service. Table names stay in app-only metadata. Requires a catalog project id and exact service key.',
  browse_service_data:
    'Read a bounded data page from a listed table or KV/R2 metadata view. Use the returned table and offset for database pages or returned cursor for KV/R2 pages. Rows stay app-only and sensitive columns are masked.',
  plan_service_deletion:
    'Prepare a short-lived deletion plan for one project-created D1 database or KV namespace. Does not delete the resource. The UI must review the impact and collect the exact resource name; the single-use token stays app-only.',
  delete_service:
    'Delete the exact project-created D1 database or KV namespace using its fresh single-use plan token and typed resource name. Rechecks identity and dependencies; never retries deletion automatically. Confirmation evidence stays app-only.',
};
const PROJECT_ICONS = [
  { theme: 'light' as const, mark: projectMark },
  { theme: 'dark' as const, mark: projectMarkDark },
].map(({ theme, mark }) => ({
  src: `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`,
  mimeType: 'image/svg+xml',
  sizes: ['any'],
  theme,
}));
export function createDashboardServer(
  store: ProjectStore,
  html: string,
  services = new ProjectServices(store),
) {
  const server = new McpServer(
    { name: 'Anhedral', version: GENERATOR_VERSION },
    {
      instructions:
        'Manage only projects explicitly registered in the local Anhedral catalog. Recorded configuration and release history are not live provider verification. To create or edit source use the Anhedral skill and get_project_context. Never expose credentials. Inspect stack, setup and target-specific delivery records offline. Authentication, permission and provider health remain unverified. Opening the dashboard is offline. Explicit service tools contact only selected providers. Rows and deletion tokens are app-only metadata; never include them in model context. Deletion requires a fresh plan and typed-name confirmation. Tools are useful without rendering UI.',
    },
  );
  registerAppResource(server, 'Anhedral', UI_RESOURCE, {}, async () => ({
    contents: [
      {
        uri: UI_RESOURCE,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        _meta: { ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } } },
      },
    ],
  }));
  registerAppTool(
    server,
    'open_projects',
    {
      title: 'Anhedral',
      // ext-apps' wrapper types omit icons; the MCP server forwards this standard field.
      ...{ icons: PROJECT_ICONS },
      description:
        'Open the optional dashboard for local registered projects. Opening reads local evidence only; explicit service actions request live readings or confirmed deletion.',
      inputSchema: z.object({ id: z.string().uuid().optional() }),
      outputSchema: dashboardSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: UI_RESOURCE },
        'openai/ui': { entrypoints: [{ type: 'global' }, { type: 'thread' }] },
      },
    },
    async ({ id }) => {
      try {
        return {
          structuredContent: store.call(id ? 'get_project' : 'list_projects', id ? { id } : {}),
          content: [
            {
              type: 'text' as const,
              text: 'Local project inspection. No provider checks or mutations were performed.',
            },
          ],
        };
      } catch (error) {
        return operationError(error);
      }
    },
  );
  const definitions = [
    [
      'list_projects',
      'List projects',
      'List registered projects with source configuration and recorded release evidence.',
      z.object({}),
      true,
    ],
    [
      'get_project',
      'Inspect a project',
      'Refresh a registered project by ID. Does not contact a provider or read secret values.',
      z.object({ id: z.string().uuid() }),
      true,
    ],
    [
      'rename_project',
      'Rename a project',
      'Change only the display name in the local catalog. The package name and source remain unchanged.',
      z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }),
      false,
    ],
    [
      'forget_project',
      'Forget a project',
      'Remove a local catalog entry after user confirmation. Never deletes project files, infrastructure or data.',
      z.object({ id: z.string().uuid() }),
      false,
    ],
    [
      'set_view',
      'Set project view',
      'Save the user’s list or grid preference.',
      z.object({ view: z.enum(['list', 'grid']) }),
      false,
    ],
  ] as const;
  for (const [name, title, description, inputSchema, readOnlyHint] of definitions)
    server.registerTool(
      name,
      {
        title,
        description,
        inputSchema,
        outputSchema: dashboardSchema,
        annotations: { readOnlyHint, destructiveHint: false, openWorldHint: false },
      },
      async (args: ToolArguments) => {
        try {
          const result = store.call(name as DashboardTool, args);
          return {
            structuredContent: result,
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          return operationError(error);
        }
      },
    );
  server.registerTool(
    'get_project_services',
    {
      title: 'List project services',
      description:
        'List application targets, declared bindings and recorded provider resources for a registered project. Local evidence only; never contacts providers or deletes resources.',
      inputSchema: z.object({ id: z.string().uuid() }).strict(),
      outputSchema: serviceInventorySchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const dashboard = store.call('get_project', { id });
        const inspection = dashboard.projects.find((project) => project.id === id)?.inspection;
        if (!inspection) throw new CatalogError('PROJECT_UNAVAILABLE');
        const inventory = serviceInventorySchema.parse(serviceInventory(inspection));
        return {
          structuredContent: inventory,
          content: [{ type: 'text' as const, text: JSON.stringify(inventory) }],
        };
      } catch (error) {
        return operationError(error);
      }
    },
  );
  for (const name of SERVICE_TOOLS) {
    const privateResult = PRIVATE_SERVICE_TOOLS.includes(name);
    server.registerTool(
      name,
      {
        title: name.replaceAll('_', ' '),
        description: serviceDescriptions[name],
        inputSchema: serviceArgumentsSchema,
        outputSchema: z
          .object({ summary: z.string(), response: serviceResponseSchema.optional() })
          .strict(),
        annotations: {
          readOnlyHint: !['plan_service_deletion', 'delete_service'].includes(name),
          destructiveHint: name === 'delete_service',
          openWorldHint: false,
        },
        ...(privateResult ? { _meta: { ui: { visibility: ['app'] } } } : {}),
      },
      async (args) => {
        try {
          const result = await services.call(name, args);
          return serviceToolResult(name, result);
        } catch {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Service operation could not complete. Check the selected identity, scoped permissions, dependencies, and provider availability. No automatic mutation retry was performed.',
              },
            ],
          };
        }
      },
    );
  }
  server.registerTool(
    'get_catalog_context',
    {
      title: 'Locate local catalog',
      description:
        'Read the installed runtime and catalog paths for operator registration of an explicitly authorized existing or newly created project. Does not register projects or grant filesystem access.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['model'] } },
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            runtime: fileURLToPath(new URL('./server.mjs', import.meta.url)),
            directory: store.directory,
          }),
        },
      ],
    }),
  );
  server.registerTool(
    'get_project_context',
    {
      title: 'Locate registered project source',
      description:
        'Resolve a catalog ID to its registered source directory before editing. Read-only; accepts no arbitrary filesystem path.',
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['model'] } },
    },
    async ({ id }) => {
      try {
        return { content: [{ type: 'text' as const, text: JSON.stringify(store.context(id)) }] };
      } catch (error) {
        return operationError(error);
      }
    },
  );
  return server;
}
