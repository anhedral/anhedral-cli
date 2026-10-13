import { fileURLToPath } from 'node:url';
import projectMark from '../../plugins/anhedral/assets/anhedral-mark.svg';
import projectMarkDark from '../../plugins/anhedral/assets/anhedral-mark-dark.svg';
import { GENERATOR_VERSION } from '../../src/version.ts';
import { McpServer } from '@modelcontextprotocol/server';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { dashboardSchema } from '../shared/schema.ts';
import { catalogFailure, type ProjectStore } from './store.ts';
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
const PROJECT_ICONS = [
  { theme: 'light' as const, mark: projectMark },
  { theme: 'dark' as const, mark: projectMarkDark },
].map(({ theme, mark }) => ({
  src: `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`,
  mimeType: 'image/svg+xml',
  sizes: ['any'],
  theme,
}));
export function createDashboardServer(store: ProjectStore, html: string) {
  const server = new McpServer(
    { name: 'Anhedral', version: GENERATOR_VERSION },
    {
      instructions:
        'Manage only projects explicitly registered in the local Anhedral catalog. Recorded configuration and release history are not live provider verification. To create or edit source use the Anhedral skill and get_project_context. Never expose credentials. Inspect stack, setup and target-specific delivery records offline. Authentication, permission and provider health remain unverified. Tools are useful without rendering UI.',
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
        'Open the optional read-only inspector for local registered projects. Recorded evidence is not live verification.',
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
