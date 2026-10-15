import {
  PRIVATE_SERVICE_TOOLS,
  type ServiceTool,
  type ServiceResponse,
} from '../shared/service-actions.ts';
/** Sensitive rows/schema and deletion tokens never enter model-visible content. */
export function serviceToolResult(name: ServiceTool, result: ServiceResponse) {
  const privateResult = PRIVATE_SERVICE_TOOLS.includes(name);
  const summary = result.data
    ? `Read ${result.data.rows.length} rows; private values are available only to the UI.`
    : result.tables
      ? `Found ${result.tables.length} tables; names are available only to the UI.`
      : result.plan
        ? 'Deletion plan prepared. Review the affected apps and type the exact resource name to confirm.'
        : (result.deletion?.message ?? 'Selected service operation completed.');
  const visible = { summary, ...(!privateResult ? { response: result } : {}) };
  return {
    structuredContent: visible,
    content: [{ type: 'text' as const, text: JSON.stringify(visible) }],
    _meta: { serviceResponse: result },
  };
}
