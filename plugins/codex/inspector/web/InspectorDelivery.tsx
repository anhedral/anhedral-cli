import { ArrowUpRight, Workflow } from 'lucide-react';
import type {
  ProjectInspection,
  ReleaseEvidence,
  TargetEvidence,
} from '../../../../src/inspector-model.ts';
import { Section, Fact, Action, EmptyState, formatRecordedDate } from './InspectorPrimitives.tsx';

function RecordedRelease({ title, release }: { title: string; release: ReleaseEvidence | null }) {
  return (
    <div className="recorded-release">
      <h4>{title}</h4>
      {release ? (
        <>
          <div className="inspection-facts">
            <Fact label="Target result">{release.state}</Fact>
            {release.operationState && (
              <Fact label="Overall attempt">{release.operationState}</Fact>
            )}
            <Fact label="Recorded">{formatRecordedDate(release.recordedAt)}</Fact>
            <Fact label="Source">
              <code>{release.commit ? release.commit.slice(0, 12) : 'Not recorded'}</code>
            </Fact>
            <Fact label="Receipt">
              <code>{release.id}</code>
            </Fact>
            {release.platform && <Fact label="Platform">{release.platform}</Fact>}
            {release.profile && <Fact label="Profile">{release.profile}</Fact>}
            {release.artifact && <Fact label="Artifact">{release.artifact}</Fact>}
          </div>
          {release.url && (
            <a className="quiet-link" href={release.url} target="_blank" rel="noreferrer">
              {release.kind === 'build' ? 'Open recorded build' : 'Open recorded deployment'}
              <ArrowUpRight size={14} />
            </a>
          )}
        </>
      ) : (
        <p className="section-note">No matching receipt recorded.</p>
      )}
    </div>
  );
}
function Target({ target }: { target: TargetEvidence }) {
  return (
    <article className="panel inspection-card">
      <div className="inspection-card-heading">
        <Workflow size={18} />
        <div>
          <h3>{target.application}</h3>
          <p>
            {target.provider} ·{' '}
            {target.delivery === 'implemented'
              ? 'CLI delivery supported'
              : target.delivery === 'artifact-only'
                ? target.provider === 'expo'
                  ? 'EAS build artifacts; store submission separate'
                  : 'Local artifact workflow'
                : 'Scaffold only'}
          </p>
        </div>
      </div>
      {target.error && <p className="inspection-unavailable">{target.error}</p>}
      <div className="inspection-facts">
        <Fact label="Target">
          <code>{target.id}</code>
        </Fact>
        <Fact label="Configured account">
          <code>{target.accountReference || 'Not recorded'}</code>
        </Fact>
        <Fact label="Configured audience">
          {target.audience === 'not-applicable'
            ? 'Not applicable'
            : target.audience === 'unconfigured'
              ? 'Not configured'
              : target.audience}
        </Fact>
        <Fact label="Live health">Unknown</Fact>
      </div>
      <RecordedRelease title="Latest recorded attempt" release={target.latestAttempt} />
      <RecordedRelease title="Last recorded success" release={target.lastSuccessful} />
    </article>
  );
}
export function Delivery({
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
            <h3>Delivery</h3>
            <p>Separate targets and saved receipts; no live provider checks are performed.</p>
          </div>
          <Action
            busy={busy}
            request={request}
            text="Inspect this project’s supported targets and run anhedral ship --dry-run. Prepare a delivery plan with remaining prerequisites, owner choices and free-tier limits. Do not provision, deploy or submit builds."
          >
            Prepare delivery plan
          </Action>
        </div>
      </section>
      <Section
        title="Application targets"
        description="A failed latest attempt does not replace an older recorded success"
        section={inspection.targets}
      >
        {(targets) =>
          targets.length ? (
            <div className="inspection-cards">
              {targets.map((target) => (
                <Target key={target.id} target={target} />
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                icon={Workflow}
                title="No targets recorded"
                description="Inspect your stack selection and application manifests to establish the delivery targets."
              />
            </div>
          )
        }
      </Section>
      <Section
        title="Last shipping operation"
        description="Local phase progress does not verify provider health or product behavior"
        section={inspection.operation}
      >
        {(operation) =>
          operation ? (
            <article className="panel inspection-card">
              <div className="section-title">
                <div>
                  <h3>{operation.target} operation</h3>
                  <p>{formatRecordedDate(operation.updatedAt)}</p>
                </div>
                <span className="status-tag">{operation.state}</span>
              </div>
              <div className="inspection-list">
                {operation.phases.map((phase) => (
                  <div className="inspection-item" key={phase.name}>
                    <span>{phase.name.replaceAll('-', ' ')}</span>
                    <span className="muted">{phase.state}</span>
                  </div>
                ))}
              </div>
            </article>
          ) : (
            <p className="section-note">No operation journal recorded.</p>
          )
        }
      </Section>
      <p className="section-note">
        Authentication, provisioning, migrations, deployment and live acceptance remain CLI or
        conversation workflows. Inspector buttons prepare unsent drafts.
      </p>
    </>
  );
}
