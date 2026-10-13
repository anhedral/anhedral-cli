/** Handle only the trusted HTML emitted by the frontend build, never arbitrary user HTML. */
export function inlineBuildAsset(html, asset, contents) {
  let result = html;
  if (asset.endsWith('.js'))
    result = html.replace(
      /<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>\s*<\/script\s*>/gi,
      () => `<script type="module">${contents.replace(/<\/script/gi, '<\\/script')}</script>`,
    );
  else if (asset.endsWith('.css'))
    result = html.replace(
      /<link\b[^>]*\bhref\s*=\s*["'][^"']+\.css["'][^>]*>/gi,
      () =>
        `<style>@layer theme, base, components, utilities;${contents.replace(/<\/style/gi, '<\\/style')}</style>`,
    );
  else return html;
  if (result === html) throw new Error(`Build asset could not be inlined: ${asset}`);
  return result;
}

export function scriptContents(html) {
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => match[1]);
}
