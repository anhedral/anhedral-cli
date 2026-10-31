// Shared high-confidence credential checks for release artifacts and source uploads.
// This is defense in depth; the service independently validates untrusted uploads.
export const CREDENTIAL_PATTERNS = Object.freeze([
  { id: 'cli-session-token', pattern: /\bacl_[a-f0-9]{64}\b/g },
  {
    id: 'device-code',
    pattern: /\bdevice_code["']?[ \t]*[:=][ \t]*["'][A-Za-z0-9_-]{20,191}["']/g,
  },
  { id: 'openai-project-key', pattern: /\bsk-proj-[A-Za-z0-9_-]{30,}/g },
  { id: 'stripe-test-key', pattern: /\b(?:sk|rk)_test_[A-Za-z0-9]{24,}\b/g },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  {
    id: 'github-token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  },
  { id: 'npm-token', pattern: /\bnpm_[A-Za-z0-9]{30,}\b/g },
  { id: 'stripe-live-key', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
  { id: 'clerk-secret-key', pattern: /\bsk_(?:test|live)_[A-Za-z0-9_-]{24,}\b/g },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { id: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    id: 'credentialed-database-uri',
    pattern:
      /\b(?:postgres(?:ql)?|rediss|mongodb(?:\+srv)?):\/\/[^:/\s"'<>]+:[^@/\s"'<>]{8,}@[^\s/"'<>]+/gi,
  },
  {
    id: 'credential-assignment',
    pattern:
      /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY)[A-Z0-9_]*["']?\s*[:=]\s*["']?[A-Za-z0-9+/_=-]{32,}["']?/gi,
  },
]);

export function isCredentialPlaceholder(id, value) {
  if (
    id === 'credentialed-database-uri' &&
    /^postgres(?:ql)?:\/\/\$\{[^{}]+\}:\$\{[^{}]+\}@\$\{[^{}]+\}$/.test(value)
  )
    return true;
  if (id !== 'credential-assignment') return false;
  const assigned = value.match(/[:=]\s*["']?([^"'\s]+)["']?$/)?.[1]?.toLowerCase();
  return Boolean(
    assigned &&
    (['***', 'change-me', 'changeme', 'example', 'not-a-secret', 'replace-me'].includes(assigned) ||
      /^(?:change|replace)(?:[-_ ]?me)?(?:[-_ ].*)?$/.test(assigned) ||
      /^(?:placeholder|your value|your-value|your_value)$/.test(assigned)),
  );
}

export function sourceContainsCredential(bytes) {
  const text = new TextDecoder().decode(bytes);
  return CREDENTIAL_PATTERNS.some(({ id, pattern }) => {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (!isCredentialPlaceholder(id, match[0])) return true;
    }
    return false;
  });
}
