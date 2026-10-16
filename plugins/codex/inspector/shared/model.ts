export type {
  ProjectSummary,
  Dashboard,
  ToolArguments,
  DashboardTool,
} from '../../../../src/catalog-model.ts';
export const TABS = ['Overview', 'Stack', 'Setup', 'Delivery', 'Services'] as const;
export type Tab = (typeof TABS)[number];
