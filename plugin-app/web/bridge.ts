import { GENERATOR_VERSION } from '../../src/version.ts';
import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { applyHostLayout } from './host-layout.ts';
import {
  newProjectDraftMessage,
  newProjectDraftUrl,
  projectDraftMessage,
  deliverUnsentDraft,
} from '../shared/starter.ts';
import { dashboardSchema } from '../shared/schema.ts';
import type { Dashboard, DashboardTool, ToolArguments } from '../shared/model.ts';

export interface DashboardBridge {
  embedded: boolean;
  connect(
    receive: (data: Dashboard) => void,
    presentation: (inline: boolean) => void,
  ): Promise<void>;
  expand(): Promise<void>;
  call(name: DashboardTool, args: ToolArguments): Promise<Dashboard>;
  message(text: string): Promise<'composer' | 'clipboard'>;
  createProject(): Promise<'composer' | 'clipboard'>;
  select(id: string | null, name?: string): Promise<void>;
  close(): Promise<void>;
}
function snapshot(value: unknown): Dashboard {
  const result = dashboardSchema.safeParse(value);
  if (!result.success) throw new Error('The project response could not be loaded.');
  return result.data;
}
function applyTheme(context: McpUiHostContext | undefined) {
  applyHostLayout(context);
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
}
export function createBridge(): DashboardBridge {
  if (window.parent !== window) {
    const app = new App({ name: 'Anhedral', version: GENERATOR_VERSION }, {});
    return {
      embedded: true,
      async connect(receive, presentation) {
        app.ontoolresult = (result) => {
          if (result.structuredContent) receive(snapshot(result.structuredContent));
        };
        app.onhostcontextchanged = (context) => {
          applyTheme(app.getHostContext());
          if (context.displayMode) presentation(context.displayMode === 'inline');
        };
        await app.connect();
        applyTheme(app.getHostContext());
        presentation(app.getHostContext()?.displayMode === 'inline');
        receive(
          snapshot(
            (await app.callServerTool({ name: 'list_projects', arguments: {} })).structuredContent,
          ),
        );
      },
      async expand() {
        await app.requestDisplayMode({ mode: 'fullscreen' });
      },
      async call(name, args) {
        const response = await app.callServerTool({ name, arguments: { ...args } });
        if (response.isError)
          throw new Error('That change could not be saved. Refresh and try again.');
        return snapshot(response.structuredContent);
      },
      async createProject() {
        return deliverUnsentDraft(
          newProjectDraftMessage(),
          app.getHostCapabilities(),
          app.getHostContext()?.platform,
          (message) => app.sendMessage(message),
          (text) => navigator.clipboard.writeText(text),
        );
      },
      async message(text) {
        return deliverUnsentDraft(
          projectDraftMessage(text),
          app.getHostCapabilities(),
          app.getHostContext()?.platform,
          (message) => app.sendMessage(message),
          (value) => navigator.clipboard.writeText(value),
        );
      },
      async select(id, name) {
        await app.updateModelContext({
          content: [
            {
              type: 'text',
              text: id
                ? `Selected Anhedral project: ${JSON.stringify({ id, name })}. Use get_project_context to locate the authorized source before editing.`
                : 'The Anhedral project inspector is open.',
            },
          ],
        });
      },
      async close() {
        await app.close();
      },
    };
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => applyDocumentTheme(media.matches ? 'dark' : 'light');
  return {
    embedded: false,
    async expand() {},
    async connect(receive) {
      update();
      media.addEventListener('change', update);
      receive(await this.call('list_projects', {}));
    },
    async call(name, args) {
      const result = await fetch('/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });
      if (!result.ok)
        throw new Error((await result.json()).error ?? 'The project could not be loaded.');
      return snapshot(await result.json());
    },
    async createProject() {
      window.location.assign(newProjectDraftUrl());
      return 'composer';
    },
    async message(text) {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    },
    async select() {},
    async close() {
      media.removeEventListener('change', update);
    },
  };
}
