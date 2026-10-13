import { KeyRound } from 'lucide-react';
import type { ProjectInspection } from '../../src/inspector-model.ts';
import { Section, Fact, Action, formatRecordedDate } from './InspectorPrimitives.tsx';

export function Setup({
  inspection,
  request,
  busy,
}: {
  inspection: ProjectInspection;
  request: (text: string) => void;
  busy: boolean;
}) {
  return (
    <>
      <section className="inspector-section">
        <div className="section-title">
          <div>
            <h3>Authentication</h3>
            <p>Provider sessions and credentials have not been checked by this inspector.</p>
          </div>
          <Action
            busy={busy}
            request={request}
            text="Check this project’s required provider access with anhedral auth --status. Use existing sessions only. Explain runtime versus management access and missing account or permission choices; do not open login or create resources."
          >
            <KeyRound size={14} />
            Review access
          </Action>
        </div>
        <p className="section-note">
          A successful access check does not establish all provisioning permissions, the intended
          account, or application readiness.
        </p>
      </section>
      <Section
        title="Provider prerequisites"
        description="Required management credential names and owner steps; access, permissions and billing are unverified"
        section={inspection.setupProviders}
      >
        {(providers) =>
          providers.length ? (
            <div className="inspection-cards">
              {providers.map((provider) => (
                <article className="panel inspection-card" key={provider.id}>
                  <h3>{provider.id}</h3>
                  <div className="inspection-facts">
                    <Fact label="Management credential">
                      <code>{provider.managementCredential || 'Provider CLI session'}</code>
                    </Fact>
                    <Fact label="Authentication">Not checked</Fact>
                    <Fact label="Permissions">Unknown</Fact>
                    <Fact label="Billing eligibility">Unknown</Fact>
                  </div>
                  <ul className="inspection-notes">
                    {provider.ownerSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-note">No required provider prerequisites recorded.</p>
          )
        }
      </Section>
      <Section
        title="Runtime requirements"
        description="Variable names from example files; no secret values or presence checks"
        section={inspection.configuration}
      >
        {(configuration) =>
          configuration.environment.length ? (
            <div className="inspection-list">
              {configuration.environment.map((variable) => (
                <div className="inspection-item" key={`${variable.application}/${variable.name}`}>
                  <code>{variable.name}</code>
                  <span className="muted">{variable.application}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="section-note">No runtime variable requirements were found.</p>
          )
        }
      </Section>
      <Section
        title="Integration setup"
        description="Local creation records, not current provider verification"
        section={inspection.integrations}
      >
        {(integrations) =>
          integrations.length ? (
            <div className="inspection-cards">
              {integrations.map((integration) => (
                <article className="panel inspection-card" key={integration.provider}>
                  <h3>{integration.provider}</h3>
                  {integration.operations.length ? (
                    integration.operations.map((operation) => (
                      <div className="integration-operation" key={operation.operation}>
                        <div className="inspection-item">
                          <code>{operation.operation}</code>
                          <span className="status-tag">
                            {operation.status === 'complete'
                              ? 'Creation recorded'
                              : 'Outcome pending'}
                          </span>
                        </div>
                        {Object.entries(operation.resources).map(([label, id]) => (
                          <Fact key={label} label={label}>
                            <code>{id}</code>
                          </Fact>
                        ))}
                        <p className="section-note">{operation.recovery}</p>
                      </div>
                    ))
                  ) : (
                    <p className="section-note">
                      No creation evidence recorded. Resource setup is unverified.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="section-note">No integration operation receipts recorded.</p>
          )
        }
      </Section>
      <Section
        title="Cloudflare resource receipts"
        description="Previously recorded IDs; existence, account access and current state are unverified"
        section={inspection.cloudflareResources}
      >
        {(resources) =>
          resources.length ? (
            <div className="inspection-list">
              {resources.map((resource) => (
                <div className="inspection-item" key={`${resource.kind}/${resource.id}`}>
                  <div>
                    <strong>{resource.name}</strong>
                    <p>
                      {resource.kind} · {formatRecordedDate(resource.recordedAt)}
                    </p>
                    <small>
                      <code>{resource.id}</code>
                    </small>
                  </div>
                  <span className="status-tag">Recorded</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="section-note">No resource receipts recorded.</p>
          )
        }
      </Section>
      <div className="inspection-actions">
        <Action
          busy={busy}
          request={request}
          text="Review anhedral.providers.json and the selected targets for this project. Explain missing account, domain, region and resource choices. Prepare a setup plan without login, provisioning, paid activation or deployment."
        >
          Review setup
        </Action>
        <Action
          busy={busy}
          request={request}
          text="Inspect this project’s integration journal with anhedral integrations status. Explain supported recovery for pending operations and one-time credentials. Do not delete state or replay creation requests."
        >
          Review recovery
        </Action>
      </div>
    </>
  );
}
