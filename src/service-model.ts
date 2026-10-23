export const SERVICE_TOOL_ACTIONS = {
  refresh_service: 'status',
  get_service_metrics: 'metrics',
  list_service_tables: 'tables',
  browse_service_data: 'data',
  plan_service_deletion: 'delete-plan',
  delete_service: 'delete',
} as const;
export type ServiceAction = (typeof SERVICE_TOOL_ACTIONS)[keyof typeof SERVICE_TOOL_ACTIONS];

export type ServiceKind = 'worker' | 'd1' | 'r2';
export interface ServiceDescriptor {
  key: string;
  kind: ServiceKind;
  id: string;
  name: string | null;
  accountId: string;
  projectId: string;
  applications: string[];
  ownership: 'created' | 'reused' | 'unknown';
}
export interface ServiceObservation {
  state: 'available' | 'not-found' | 'permission-required' | 'unavailable';
  fetchedAt: string;
  name?: string;
  storageBytes?: number;
  message: string;
}
export interface ServiceMetrics {
  fetchedAt: string;
  start: string;
  end: string;
  timezone: 'UTC';
  source: string;
  sampled: boolean;
  points: { time: string; values: Record<string, number> }[];
  units: Record<string, string>;
}
export interface ServiceData {
  fetchedAt: string;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  offset: number;
  hasMore: boolean;
  masked: boolean;
  nextCursor?: string;
}
