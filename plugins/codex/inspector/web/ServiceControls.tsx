import { useEffect, useRef, useState } from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import type { ServiceEntry } from '../shared/services.ts';
import type { ServiceResponse, ServiceTool, ServiceArguments } from '../shared/service-actions.ts';
export function ServiceControls({
  entry,
  call,
}: {
  entry: ServiceEntry;
  call: (tool: ServiceTool, args: Omit<ServiceArguments, 'id'>) => Promise<ServiceResponse>;
}) {
  const integration =
    entry.group === 'Integrations' && ['stripe', 'revenuecat'].includes(entry.provider);
  const supported =
    integration ||
    (entry.provider === 'cloudflare' &&
      (entry.group === 'Applications' || ['D1', 'R2', 'd1', 'r2'].includes(entry.kind)));
  const database = ['D1', 'd1'].includes(entry.kind);
  const r2 = ['R2', 'r2'].includes(entry.kind);
  const metricsSupported = database || entry.group === 'Applications';
  const daily = database;
  const [now, setNow] = useState(Date.now());
  const [operation, setOperation] = useState<ServiceTool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ServiceResponse>({});
  const [table, setTable] = useState('');
  const [hours, setHours] = useState(24);
  const [typedName, setTypedName] = useState('');
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  useEffect(() => {
    if (!result.plan) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [result.plan]);
  async function run(tool: ServiceTool, args: Omit<ServiceArguments, 'id' | 'key'> = {}) {
    const id = ++sequence.current;
    setBusy(true);
    setOperation(tool);
    setError('');
    try {
      const response = await call(tool, { key: entry.id, ...args });
      if (sequence.current !== id) return;
      setResult((previous) => ({ ...previous, ...response }));
      if (response.tables) setTable(response.tables[0] ?? '');
      if (response.deletion) {
        setResult(response);
        setTypedName('');
      }
    } catch {
      if (sequence.current === id)
        setError(
          'This operation could not complete. Check permissions, resource identity, and dependencies.',
        );
    } finally {
      if (sequence.current === id) {
        setBusy(false);
        setOperation(null);
      }
    }
  }
  if (!supported) return null;
  return (
    <div className="service-controls">
      <div className="service-buttons">
        <Button
          size="sm"
          color="secondary"
          variant="outline"
          disabled={busy}
          onClick={() => void run('refresh_service')}
        >
          Check live status
        </Button>
        {metricsSupported && (
          <Button
            size="sm"
            color="secondary"
            variant="outline"
            disabled={busy}
            onClick={() => void run('get_service_metrics', { hours: hours as 1 | 24 | 168 })}
          >
            Load analytics
          </Button>
        )}
        {(database || r2) && (
          <Button
            size="sm"
            color="secondary"
            variant="outline"
            disabled={busy}
            onClick={() => void run('list_service_tables')}
          >
            Browse data
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="service-error">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="section-note">
          {operation === 'delete_service'
            ? 'Deleting the confirmed service…'
            : 'Loading selected service data…'}
        </p>
      )}
      {result.status && (
        <div role="status" className="service-result">
          <strong>{result.status.state.replaceAll('-', ' ')}</strong>
          <p>{result.status.message}</p>
          {result.status.storageBytes !== undefined && (
            <p>Current storage: {result.status.storageBytes.toLocaleString()} bytes</p>
          )}
          <small>Checked {new Date(result.status.fetchedAt).toLocaleString()}</small>
        </div>
      )}
      {result.metrics && (
        <section className="service-result">
          <h4>Analytics</h4>
          <select
            aria-label={`Analytics window for ${entry.name}`}
            value={hours}
            onChange={(event) => {
              setHours(Number(event.target.value));
            }}
          >
            {!daily && <option value={1}>Last hour</option>}
            <option value={24}>{daily ? 'Last complete UTC day' : 'Last 24 hours'}</option>
            <option value={168}>{daily ? 'Last 7 complete UTC days' : 'Last 7 days'}</option>
          </select>
          <p className="section-note">
            {result.metrics.source} · UTC ·{' '}
            {result.metrics.sampled ? 'Adaptive sampling' : 'Provider aggregation'}
          </p>
          <p className="section-note">
            {result.metrics.start} – {result.metrics.end}
            <br />
            Read {new Date(result.metrics.fetchedAt).toLocaleString()}
          </p>
          {result.metrics.points.length ? (
            <div className="service-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    {Object.keys(result.metrics.units).map((name) => (
                      <th key={name}>
                        {name} ({result.metrics!.units[name]})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.points.map((point, index) => (
                    <tr key={index}>
                      <td>{point.time}</td>
                      {Object.keys(result.metrics!.units).map((name) => (
                        <td key={name}>{point.values[name]?.toLocaleString() ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No metrics returned for this window. This does not prove healthy traffic.</p>
          )}
        </section>
      )}
      {result.tables && (
        <section className="service-result">
          <h4>{database ? 'Database tables' : r2 ? 'Object metadata' : 'Key metadata'}</h4>
          {result.tables.length ? (
            <div className="service-buttons">
              <select
                aria-label={`Data table for ${entry.name}`}
                value={table}
                onChange={(event) => {
                  setTable(event.target.value);
                  setResult((previous) => ({ ...previous, data: undefined }));
                }}
              >
                {result.tables.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <Button
                size="sm"
                color="secondary"
                variant="outline"
                disabled={busy}
                onClick={() => void run('browse_service_data', { table, offset: 0 })}
              >
                Load rows
              </Button>
            </div>
          ) : (
            <p>No tables found.</p>
          )}
          {result.data && (
            <>
              <p className="section-note">
                Private data stays in this view. Values in sensitive columns are masked. Read{' '}
                {new Date(result.data.fetchedAt).toLocaleString()}.
              </p>
              <div className="service-table-scroll">
                <table>
                  <thead>
                    <tr>
                      {result.data.columns.map((name) => (
                        <th key={name}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((value, column) => (
                          <td key={column}>{value === null ? 'null' : String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!result.data.rows.length && <p>This table is empty.</p>}
              {r2 && result.data.hasMore && (
                <Button
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run('browse_service_data', { table, cursor: result.data!.nextCursor })
                  }
                >
                  {r2 ? 'Next objects' : 'Next keys'}
                </Button>
              )}
              {database && (
                <div className="service-buttons">
                  <Button
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={busy || result.data.offset === 0}
                    onClick={() =>
                      void run('browse_service_data', {
                        table,
                        offset: Math.max(0, result.data!.offset - 25),
                      })
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={busy || !result.data.hasMore}
                    onClick={() =>
                      void run('browse_service_data', { table, offset: result.data!.offset + 25 })
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      {database &&
        entry.ownership === 'created' &&
        !['Deleted', 'Deletion pending', 'Deletion uncertain'].includes(entry.status) && (
          <div className="service-delete">
            {!result.plan ? (
              <Button
                size="sm"
                color="danger"
                variant="outline"
                disabled={busy || !!result.deletion}
                onClick={() => void run('plan_service_deletion')}
              >
                Review service deletion
              </Button>
            ) : (
              <section aria-label="Confirm service deletion" className="service-confirmation">
                <h4>Delete {result.plan.name}?</h4>
                <p>{result.plan.impact}</p>
                <p>
                  {Date.parse(result.plan.expiresAt) <= now
                    ? 'Confirmation expired. Cancel and prepare a new plan.'
                    : `Confirmation expires ${new Date(result.plan.expiresAt).toLocaleTimeString()}.`}
                </p>
                <p>
                  Account <code>{result.plan.accountId}</code> · Resource{' '}
                  <code>{result.plan.resourceId}</code>
                </p>
                <p>
                  Affected apps:{' '}
                  {result.plan.applications.join(', ') || 'No local binding recorded'}
                </p>
                <Input
                  aria-label="Type resource name to confirm"
                  placeholder={result.plan.name}
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
                <div className="service-buttons">
                  <Button
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      sequence.current++;
                      setTypedName('');
                      setResult((previous) => ({ ...previous, plan: undefined }));
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    disabled={
                      busy ||
                      typedName !== result.plan.name ||
                      Date.parse(result.plan.expiresAt) <= now
                    }
                    onClick={() =>
                      void run('delete_service', { token: result.plan!.token, typedName })
                    }
                  >
                    Delete service and data
                  </Button>
                </div>
              </section>
            )}
            {result.deletion && <p role="status">{result.deletion.message}</p>}
          </div>
        )}
    </div>
  );
}
