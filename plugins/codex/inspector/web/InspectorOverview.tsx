import { ProjectLifecycle } from './ProjectLifecycle.tsx';
import { useEffect, useState } from 'react';
import { Check, CircleHelp } from 'lucide-react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import type { ProjectInspection } from '../../../../src/inspector-model.ts';
import {
  Section,
  Fact,
  Action,
  formatRecordedDate,
  type ViewProps,
} from './InspectorPrimitives.tsx';

export function Overview({
  site,
  inspection,
  busy,
  rename,
  forget,
  request,
}: ViewProps & { inspection: ProjectInspection }) {
  const [name, setName] = useState(site.name);
  const [confirmForget, setConfirmForget] = useState(false);
  useEffect(() => {
    setName(site.name);
    setConfirmForget(false);
  }, [site.id, site.name]);
  return (
    <>
      <ProjectLifecycle inspection={inspection} busy={busy} request={request} />
      <section className="inspector-section">
        <div className="section-title">
          <div>
            <h3>Project overview</h3>
            <p>
              Local source and recorded evidence · Inspected{' '}
              {formatRecordedDate(inspection.inspectedAt)}
            </p>
          </div>
        </div>
        <div className="inspection-facts">
          <Fact label="Package">
            <code>{site.sourceName || inspection.name || 'Not recorded'}</code>
          </Fact>
          <Fact label="Authentication">Not checked</Fact>
          <Fact label="Live health">Unknown</Fact>
        </div>
        <p className="section-note">
          Refresh reads project files. It does not sign in, provision resources, deploy, or check
          live health.
        </p>
      </section>
      <Section
        title="Selected stack"
        description="Options recorded by the initializer"
        section={inspection.selection}
      >
        {(selection) => (
          <>
            <div className="inspection-facts">
              <Fact label="CLI version">{selection.cliVersion || 'Not recorded'}</Fact>
              <Fact label="Web hosting">{selection.hosting || 'No web host selected'}</Fact>
            </div>
            {selection.products.length ? (
              <div className="stack-tags">
                {selection.products.map((product) => (
                  <span key={product}>{product}</span>
                ))}
              </div>
            ) : (
              <p className="section-note">No stack selection recorded.</p>
            )}
          </>
        )}
      </Section>
      <Section
        title="Delivery summary"
        description="Target results are recorded separately; current provider health is unknown"
        section={inspection.targets}
      >
        {(targets) =>
          targets.length ? (
            <div className="inspection-cards">
              {targets.map((target) => (
                <article className="panel inspection-card" key={target.id}>
                  <h3>{target.application}</h3>
                  <p>
                    {target.provider} · {target.id}
                  </p>
                  {target.error && <p className="inspection-unavailable">{target.error}</p>}
                  <div className="inspection-facts">
                    <Fact label="Latest target result">
                      {target.latestAttempt?.state ?? 'No matching receipt'}
                    </Fact>
                    {target.latestAttempt?.operationState && (
                      <Fact label="Overall attempt">{target.latestAttempt.operationState}</Fact>
                    )}
                    <Fact label="Last recorded success">
                      {target.lastSuccessful
                        ? formatRecordedDate(target.lastSuccessful.recordedAt)
                        : 'No matching receipt'}
                    </Fact>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-note">No delivery targets recorded.</p>
          )
        }
      </Section>
      <Section
        title="Local readiness"
        description="Source structure and provenance checks; product behavior remains separate"
        section={inspection.readiness}
      >
        {(readiness) => (
          <>
            <span className="status-tag">
              {readiness.localReady ? 'Local structure ready' : 'Source needs attention'}
            </span>
            <div className="inspection-checks">
              {readiness.checks.map((check) => (
                <div className="inspection-check" key={check.id}>
                  {check.ok ? <Check size={16} /> : <CircleHelp size={16} />}
                  <div>
                    <strong>{check.id}</strong>
                    <p>{check.detail}</p>
                  </div>
                  <span className="muted">{check.ok ? 'Pass' : 'Review'}</span>
                </div>
              ))}
            </div>
            <Action
              busy={busy}
              request={request}
              text="Review this project’s local readiness using anhedral doctor. Explain any missing or conflicting source configuration before making changes."
            >
              Review readiness
            </Action>
          </>
        )}
      </Section>
      <section className="inspector-section">
        <h3>Evidence boundaries</h3>
        <ul className="inspection-notes">
          {inspection.limits.map((limit, index) => (
            <li key={index}>{limit}</li>
          ))}
        </ul>
      </section>
      <section className="inspector-section">
        <div className="section-title">
          <div>
            <h3>Local catalog</h3>
            <p>Display name and list membership only</p>
          </div>
        </div>
        <form
          className="catalog-name-form"
          onSubmit={(event) => {
            event.preventDefault();
            rename(name.trim());
          }}
        >
          <Input
            variant="soft"
            disabled={busy}
            aria-label="Project display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
          <Button
            color="secondary"
            variant="outline"
            type="submit"
            size="sm"
            disabled={busy || !name.trim() || name.trim() === site.name}
          >
            Save name
          </Button>
        </form>
        <div className="catalog-forget">
          {confirmForget ? (
            <>
              <p>
                Remove this entry from the local catalog? Your source, data and provider resources
                stay intact.
              </p>
              <div className="inspection-actions">
                <Button
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmForget(false)}
                >
                  Cancel
                </Button>
                <Button color="danger" variant="outline" size="sm" disabled={busy} onClick={forget}>
                  Forget project
                </Button>
              </div>
            </>
          ) : (
            <Button
              color="secondary"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmForget(true)}
            >
              Forget from catalog
            </Button>
          )}
        </div>
      </section>
    </>
  );
}
