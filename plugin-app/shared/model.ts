import type { ProjectInspection } from '../../src/inspector-model.ts';
export const TABS = ['Overview', 'Services', 'Stack', 'Setup', 'Delivery'] as const;
export type Tab = (typeof TABS)[number];
export interface ProjectSummary {
  id: string;
  name: string;
  sourceName: string;
  updatedAt: string;
  products: string[];
  status: 'recorded' | 'source' | 'unavailable';
  message?: string;
  inspection?: ProjectInspection;
}
export interface Dashboard {
  projects: ProjectSummary[];
  selectedId: string | null;
  preferences: { view: 'list' | 'grid' };
}
export interface ToolArguments {
  id?: string;
  name?: string;
  view?: 'list' | 'grid';
}
export type DashboardTool =
  'list_projects' | 'get_project' | 'rename_project' | 'forget_project' | 'set_view';
