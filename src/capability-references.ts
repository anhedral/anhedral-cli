import { readFileSync } from 'node:fs';
export function capabilityReferences() {
  return {
    'docs/anhedral/capabilities.md': readFileSync(
      new URL('../docs/capabilities.md', import.meta.url),
      'utf8',
    ),
    'docs/anhedral/ui.md': readFileSync(new URL('../docs/ui.md', import.meta.url), 'utf8'),
  };
}
