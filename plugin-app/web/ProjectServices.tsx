import { useMemo, useState } from 'react';
import { Boxes, ExternalLink, Search } from 'lucide-react';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import type { ProjectInspection } from '../../src/inspector-model.ts';
import { serviceInventory, type ServiceGroup } from '../shared/services.ts';
import { EmptyState, formatRecordedDate } from './InspectorPrimitives.tsx';

export function Services({ inspection }: { inspection: ProjectInspection }) {
  const inventory = useMemo(() => serviceInventory(inspection), [inspection]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<ServiceGroup | 'All'>('All');
  const query = search.trim().toLocaleLowerCase();
  const entries = inventory.entries.filter(
    (entry) =>
      (group === 'All' || entry.group === group) &&
      [entry.name, entry.provider, entry.kind, entry.resourceId ?? '', ...entry.applications]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
  );
  return (
    <section className="inspector-section">
      <div className="section-title">
        <div>
          <h3>Apps and services</h3>
          <p>Source configuration and recorded resources · Live state not checked</p>
        </div>
      </div>
      <div className="service-toolbar">
        <Input
          pill
          size="lg"
          startAdornment={<Search size={16} />}
          aria-label="Search services"
          placeholder="Search services"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="service-filter">
          <span>Show</span>
          <select
            aria-label="Service category"
            value={group}
            onChange={(event) => setGroup(event.target.value as ServiceGroup | 'All')}
          >
            {(['All', 'Applications', 'Resources', 'Integrations'] as const).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {inventory.errors.map((error) => (
        <p className="inspection-unavailable" role="status" key={error}>
          {error}
        </p>
      ))}
      <p className="section-note" role="status">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </p>
      {entries.length ? (
        <div className="inspection-cards">
          {entries.map((entry) => (
            <article className="panel inspection-card service-card" key={entry.id}>
              <div className="inspection-card-heading">
                <Boxes size={18} aria-hidden="true" />
                <div>
                  <h3>{entry.name}</h3>
                  <p>
                    {entry.provider} · {entry.kind}
                  </p>
                </div>
                <span className="status-tag">{entry.status}</span>
              </div>
              {entry.applications.map((application) => (
                <p key={application}>
                  <code>{application}</code>
                </p>
              ))}
              {entry.resourceId && (
                <p className="service-identity">
                  <code>{entry.resourceId}</code>
                </p>
              )}
              <details>
                <summary>Service details</summary>
                <dl className="service-details">
                  <div>
                    <dt>Evidence recorded</dt>
                    <dd>{formatRecordedDate(entry.recordedAt)}</dd>
                  </div>
                  <div>
                    <dt>Resource ownership</dt>
                    <dd>
                      {entry.ownership === 'created'
                        ? 'Created by a recorded operation'
                        : entry.ownership === 'reused'
                          ? 'Reused existing resource'
                          : 'Not established'}
                    </dd>
                  </div>
                </dl>
                {entry.notes.map((note, index) => (
                  <p className="section-note" key={index}>
                    {note}
                  </p>
                ))}
              </details>
              {entry.url && (
                <a className="quiet-link" href={entry.url} target="_blank" rel="noreferrer">
                  Open recorded release <ExternalLink size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title={query || group !== 'All' ? 'No matching services' : 'No services recorded'}
          description={
            query || group !== 'All'
              ? 'Change your search or category to see other services.'
              : 'Services appear from your project configuration and provisioning receipts.'
          }
        />
      )}
      {inventory.capabilities.length > 0 && (
        <section className="service-capabilities">
          <h4>Selected stack</h4>
          <p className="section-note">
            Selected options include local libraries and tooling, not only hosted services.
          </p>
          <div className="inspection-list">
            {inventory.capabilities.map((capability) => (
              <div className="inspection-item" key={capability.name}>
                <div>
                  <strong>{capability.name}</strong>
                  <p>{capability.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
