import { createHash, createHmac } from 'node:crypto';
import type { ServiceData, ServiceDescriptor } from './service-model.js';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: string | Buffer, value: string) =>
  createHmac('sha256', key).update(value).digest();
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
function xmlValue(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos);/g,
    (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity]!,
  );
}
export async function browseR2Objects(
  service: ServiceDescriptor,
  cursor: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  send: typeof fetch = fetch,
): Promise<ServiceData> {
  if (
    service.kind !== 'r2' ||
    !/^[a-f0-9]{32}$/.test(service.accountId) ||
    !service.name ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(service.name) ||
    (cursor !== undefined && (cursor.length > 4096 || /[\x00-\x1f\x7f]/.test(cursor)))
  )
    throw new Error('Choose a supported R2 bucket and cursor.');
  const key =
    env[`ANHEDRAL_R2_ACCESS_KEY_ID_${service.accountId.toUpperCase()}`] ??
    env.ANHEDRAL_R2_ACCESS_KEY_ID;
  const secret =
    env[`ANHEDRAL_R2_SECRET_ACCESS_KEY_${service.accountId.toUpperCase()}`] ??
    env.ANHEDRAL_R2_SECRET_ACCESS_KEY;
  if (
    !key ||
    !secret ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(key) ||
    !/^[\x21-\x7e]{8,256}$/.test(secret)
  )
    throw new Error('Provide scoped read-only R2 S3 credentials for metadata browsing.');
  const host = `${service.accountId}.r2.cloudflarestorage.com`;
  const pathname = `/${service.name}`;
  const params: Record<string, string> = {
    'list-type': '2',
    'max-keys': '25',
    ...(cursor ? { 'continuation-token': cursor } : {}),
  };
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encode(name)}=${encode(value)}`)
    .join('&');
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const date = timestamp.slice(0, 8);
  const payloadHash = hash('');
  const headers = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`;
  const signed = 'host;x-amz-content-sha256;x-amz-date';
  const scope = `${date}/auto/s3/aws4_request`;
  const canonical = `GET\n${pathname}\n${query}\n${headers}\n${signed}\n${payloadHash}`;
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + secret, date), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey)
    .update(`AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${hash(canonical)}`)
    .digest('hex');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await send(`https://${host}${pathname}?${query}`, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Authorization: `AWS4-HMAC-SHA256 Credential=${key}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
        'x-amz-date': timestamp,
        'x-amz-content-sha256': payloadHash,
      },
    });
    if (!response.ok) {
      void response.body?.cancel();
      throw new Error('R2 metadata read requires scoped access and provider availability.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty R2 metadata response.');
    const abort = () => {
      void reader.cancel();
    };
    controller.signal.addEventListener('abort', abort, { once: true });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > 2 * 1024 * 1024 || controller.signal.aborted)
          throw new Error('R2 metadata exceeded its limits.');
        chunks.push(chunk.value);
      }
    } catch (error) {
      void reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      controller.signal.removeEventListener('abort', abort);
      reader.releaseLock();
    }
    if (controller.signal.aborted) throw new Error('R2 metadata request timed out.');
    const xml = Buffer.concat(chunks).toString('utf8');
    if (
      /<!DOCTYPE|<!ENTITY/i.test(xml) ||
      !/<ListBucketResult(?:\s[^>]*)?>/.test(xml) ||
      !xml.includes('</ListBucketResult>') ||
      !/<IsTruncated>(?:true|false)<\/IsTruncated>/.test(xml) ||
      xmlValue(xml.match(/<Name>([^<]*)<\/Name>/)?.[1] ?? '') !== service.name
    )
      throw new Error('R2 metadata does not match the selected bucket.');
    const contents = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)];
    if (contents.length > 25) throw new Error('R2 metadata page exceeded its limit.');
    const rows = contents.map((entry) => {
      const value = entry[1];
      const key = xmlValue(value.match(/<Key>([^<]*)<\/Key>/)?.[1] ?? '');
      const size = Number(value.match(/<Size>(\d+)<\/Size>/)?.[1]);
      const modified = value.match(/<LastModified>([^<]*)<\/LastModified>/)?.[1];
      if (
        !key ||
        !Number.isSafeInteger(size) ||
        size < 0 ||
        !modified ||
        !Number.isFinite(Date.parse(modified))
      )
        throw new Error('Unsupported object metadata.');
      return [key.slice(0, 1000), size, modified];
    });
    const nextCursor = xmlValue(
      xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)?.[1] ?? '',
    );
    const hasMore = xml.includes('<IsTruncated>true</IsTruncated>');
    if (hasMore && (!nextCursor || nextCursor.length > 4096))
      throw new Error('R2 cursor is unavailable.');
    return {
      fetchedAt: new Date().toISOString(),
      columns: ['Object key', 'Size (bytes)', 'Last modified'],
      rows,
      offset: 0,
      hasMore,
      masked: false,
      ...(hasMore ? { nextCursor } : {}),
    };
  } catch {
    throw new Error(
      'R2 metadata could not be read. Check selected bucket, read-only S3 credentials, permissions, and response limits.',
    );
  } finally {
    clearTimeout(timer);
  }
}
