import { mkdirSync, realpathSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import path from 'node:path';
import type { applicationStatus } from './delivery.js';

const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
const link = (url: string, label: string) => {
  try {
    const value = new URL(url);
    if (value.protocol === 'https:' && !value.username && !value.password)
      return `<a href="${escape(value.href)}" target="_blank" rel="noreferrer">${escape(label)}</a>`;
  } catch {
    /* Omit invalid links. */
  }
  return escape(label);
};
/** A disposable projection of project/provider evidence; no manually maintained UI state. */
export function writeManagementOverview(
  root: string,
  snapshot: Awaited<ReturnType<typeof applicationStatus>>,
): string {
  root = realpathSync(root);
  const directory = path.join(root, '.anhedral');
  mkdirSync(directory, { recursive: true });
  if (realpathSync(directory) !== directory)
    throw new Error('Management directory must not be a symbolic link.');
  const latest = snapshot.releases.at(-1);
  const targets = snapshot.architecture
    .map((target) => {
      const receipt = latest?.targets.find((item) => item.target === target.target);
      const provider = snapshot.provider.find((item) => item.target === target.target);
      return `<article><h3>${escape(target.workerName)}</h3><p>${escape(target.directory)}</p><p>${provider ? escape(provider.versions.map((version) => `${version.versionId}: ${version.percentage}%`).join(', ')) : 'Provider not refreshed'}</p><p>${(receipt?.urls ?? []).map((url) => link(url, url)).join('<br>') || 'No recorded URL'}</p><ul>${target.bindings.map((binding) => `<li>${escape(binding.binding)} — ${escape(binding.kind)}</li>`).join('')}</ul><p>Schedules: ${target.scheduled.map(escape).join(', ') || 'None configured'}</p></article>`;
    })
    .join('');
  const history = [...snapshot.releases]
    .reverse()
    .map(
      (release) =>
        `<tr><td>${escape(release.startedAt)}</td><td>${escape(release.state)}</td><td>${escape(release.commit)}</td><td>${escape(release.id)}</td></tr>`,
    )
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(snapshot.project.name)} · Anhedral</title><style>body{font:16px system-ui;background:#111318;color:#e7e9ef;max-width:1100px;margin:3rem auto;padding:0 1.5rem}a{color:#a9c7ff}h1{font-size:2rem}h2{margin-top:2rem}article{border:1px solid #363c49;border-radius:12px;padding:1rem;margin:1rem 0}p,li{line-height:1.6}table{width:100%;border-collapse:collapse;font-size:.85rem}td,th{text-align:left;padding:.6rem;border-bottom:1px solid #363c49;overflow-wrap:anywhere}code{overflow-wrap:anywhere}.muted{color:#a5adbd}</style></head><body><h1>${escape(snapshot.project.name)}</h1><p>Customer-owned · ${escape(snapshot.project.provider)} · ${escape(snapshot.project.audience)}</p><p class="muted">Snapshot ${escape(new Date().toISOString())} · ${escape(snapshot.evidence)}. Run <code>anhedral manage</code> to refresh. This file is local, not an access control or a hosted registry.</p><p>Account: <code>${escape(snapshot.project.accountId ?? 'Not connected')}</code></p><p>${snapshot.management ? link(snapshot.management, 'Open provider dashboard') : 'Connect an account to manage hosting.'}</p><p>Product acceptance: ${escape(snapshot.productVerification)}. Deployment evidence does not establish working user flows.</p><h2>Applications and resources</h2>${targets || '<p>No Cloudflare targets.</p>'}<h2>Release history</h2><table><thead><tr><th>Started</th><th>State</th><th>Source commit</th><th>Release</th></tr></thead><tbody>${history}</tbody></table></body></html>`;
  const file = path.join(directory, 'overview.html');
  // Refuse a pre-existing symlink through realpath; use a fresh temporary file and atomic rename in the caller's state directory.
  const temporary = path.join(directory, `overview-${randomUUID()}.tmp`);
  writeFileSync(temporary, html, { mode: 0o600, flag: 'wx' });
  try {
    renameSync(temporary, file);
    return file;
  } finally {
    rmSync(temporary, { force: true });
  }
}
