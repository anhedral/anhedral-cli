import type { ProjectInspection } from './inspector-model.js';
export interface ProjectLifecycle {
  supportedConfiguration: boolean;
  init: { state: 'configured' | 'needs-attention' | 'unavailable'; message: string };
  auth: {
    state: 'not-checked';
    providers: string[];
    accounts: { provider: string; reference: string }[];
    message: string;
  };
  ship: {
    state: 'not-recorded' | 'recorded' | 'needs-attention';
    successfulTargets: number;
    totalTargets: number;
    message: string;
  };
}
/** Derive lifecycle evidence from the CLI inspector. Never infer authentication or live health. */
export function projectLifecycle(inspection: ProjectInspection): ProjectLifecycle {
  const supportedConfiguration =
    inspection.selection.state === 'available' &&
    Boolean(inspection.selection.data.cliVersion) &&
    inspection.selection.data.products.length > 0;
  const targets = inspection.targets.state === 'available' ? inspection.targets.data : [];
  const successfulTargets = targets.filter((target) => target.lastSuccessful).length;
  const accounts = targets
    .flatMap((target) =>
      target.accountReference
        ? [{ provider: target.provider, reference: target.accountReference }]
        : [],
    )
    .filter(
      (account, index, values) =>
        values.findIndex(
          (value) => value.provider === account.provider && value.reference === account.reference,
        ) === index,
    );
  const blocked =
    inspection.targets.state === 'unavailable' ||
    inspection.serviceDeletions?.state === 'unavailable' ||
    Boolean(inspection.serviceDeletions?.data.length) ||
    inspection.operation.state === 'unavailable' ||
    Boolean(inspection.operation.data && inspection.operation.data.state !== 'completed') ||
    targets.some(
      (target) =>
        target.error ||
        target.delivery === 'scaffold-only' ||
        (target.latestAttempt && target.latestAttempt.id !== target.lastSuccessful?.id),
    );
  const shipState = blocked
    ? 'needs-attention'
    : targets.length && successfulTargets === targets.length
      ? 'recorded'
      : 'not-recorded';
  return {
    supportedConfiguration,
    init: {
      state: !supportedConfiguration
        ? 'unavailable'
        : inspection.readiness.state === 'available' && inspection.readiness.data.localReady
          ? 'configured'
          : 'needs-attention',
      message: !supportedConfiguration
        ? 'No supported Anhedral stack configuration found. Registering a folder does not adopt its application.'
        : 'Anhedral stack configuration recorded. Local checks describe source structure, not feature completeness.',
    },
    auth: {
      state: 'not-checked',
      providers:
        inspection.setupProviders.state === 'available'
          ? inspection.setupProviders.data.map((provider) => provider.id)
          : [],
      accounts,
      message:
        'Account references are recorded selections. Provider sessions, permissions and billing eligibility require an explicit access check.',
    },
    ship: {
      state: shipState,
      successfulTargets,
      totalTargets: targets.length,
      message: blocked
        ? 'Review incomplete, conflicting or deletion evidence before shipping. Prior successes remain history.'
        : shipState === 'recorded'
          ? 'Success receipts exist for the recorded targets. Current source, live health and product behavior require separate verification.'
          : 'No complete set of successful target receipts is recorded. Review the delivery plan before provisioning or deploying.',
    },
  };
}
