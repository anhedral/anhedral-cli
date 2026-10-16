import type { ProjectInspection } from '../../../../src/inspector-model.ts';
import { projectLifecycle } from '../../../../src/project-lifecycle.ts';
import { Action, Fact } from './InspectorPrimitives.tsx';
const labels = {
  configured: 'Configuration recorded',
  'needs-attention': 'Needs review',
  unavailable: 'Setup not found',
  'not-checked': 'Access not checked',
  'not-recorded': 'Delivery not recorded',
  recorded: 'Success recorded',
};
export function ProjectLifecycle({
  inspection,
  busy,
  request,
}: {
  inspection: ProjectInspection;
  busy: boolean;
  request: (text: string) => void;
}) {
  const lifecycle = projectLifecycle(inspection);
  return (
    <section className="inspector-section" aria-labelledby="project-lifecycle-heading">
      <div className="section-title">
        <div>
          <h3 id="project-lifecycle-heading">Init → Auth → Ship</h3>
          <p>Your source, your provider accounts, one shared CLI workflow.</p>
        </div>
      </div>
      <ol className="lifecycle-steps">
        <li className="panel inspection-card">
          <h4>1. Init</h4>
          <span className="status-tag">{labels[lifecycle.init.state]}</span>
          <p>{lifecycle.init.message}</p>
          {lifecycle.supportedConfiguration && (
            <Action
              busy={busy}
              request={request}
              text="Review this selected Anhedral project with anhedral doctor. Explain the stack, local readiness and missing configuration. Do not initialize over existing source or change files."
            >
              Review source
            </Action>
          )}
        </li>
        <li className="panel inspection-card">
          <h4>2. Auth</h4>
          <span className="status-tag">{labels[lifecycle.auth.state]}</span>
          <p>{lifecycle.auth.message}</p>
          <Fact label="Selected providers">
            {lifecycle.auth.providers.join(' · ') || 'Not recorded'}
          </Fact>
          {lifecycle.auth.accounts.map((account) => (
            <Fact
              key={`${account.provider}/${account.reference}`}
              label={`${account.provider} account selection`}
            >
              <code>{account.reference}</code>
            </Fact>
          ))}
          {lifecycle.supportedConfiguration && (
            <Action
              busy={busy}
              request={request}
              text="Run anhedral auth --status for the selected project using existing provider sessions. Verify intended accounts, explain missing access and permission limits. Do not open login, provision resources, activate billing or deploy."
            >
              Review provider access
            </Action>
          )}
        </li>
        <li className="panel inspection-card">
          <h4>3. Ship</h4>
          <span className="status-tag">{labels[lifecycle.ship.state]}</span>
          <p>{lifecycle.ship.message}</p>
          <Fact label="Targets with success receipts">
            {lifecycle.ship.successfulTargets} of {lifecycle.ship.totalTargets}
          </Fact>
          {lifecycle.supportedConfiguration && (
            <Action
              busy={busy}
              request={request}
              text="Run anhedral ship --dry-run for the selected project. Review target identities, previous failures, source changes, deletion records and remaining prerequisites. Present a delivery plan without provisioning, deployment, paid activation or build submission."
            >
              Review shipping plan
            </Action>
          )}
        </li>
      </ol>
      <p className="section-note">
        Actions prepare an unsent Codex draft. Opening or refreshing this dashboard reads local
        evidence only. Live service readings are requested separately in Services.
      </p>
    </section>
  );
}
