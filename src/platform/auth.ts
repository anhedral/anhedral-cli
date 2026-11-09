import { z } from 'zod';
import { commandArgumentError, commandArguments } from '../cli-arguments.js';
import { createReporter } from '../cli-output.js';
import { cliDeviceSchema, cliLoginSchema } from '../contracts/cli-transport.js';
import { platformFailure, type SecretStore } from './state.js';

const pending = z
  .object({ origin: z.string(), device: cliDeviceSchema, expiresAt: z.number() })
  .strict();

type Request = (path: string, method: string, body?: unknown) => Promise<unknown>;

export async function runLogin({
  options,
  origin,
  reporter,
  store,
  readCredential,
  request,
  sleep,
}: {
  options: ReturnType<typeof commandArguments>;
  origin: string;
  reporter: ReturnType<typeof createReporter>;
  store: SecretStore;
  readCredential: () => Promise<unknown>;
  request: Request;
  sleep?: (ms: number) => Promise<void>;
}) {
  const emit = (result: unknown) => reporter.result(result);
  if (options.positional.length)
    throw commandArgumentError('login', 'Login does not accept positional arguments.');
  let state = pending.safeParse(await readCredential());
  if (
    !options.has('--resume') ||
    !state.success ||
    state.data.origin !== origin ||
    state.data.expiresAt <= Date.now()
  ) {
    const device = cliDeviceSchema.parse(await request('/auth/code', 'POST', {}));
    if (
      new URL(device.verification_uri_complete).origin !== origin ||
      new URL(device.verification_uri_complete).protocol !== new URL(origin).protocol
    )
      throw platformFailure('Platform returned an unexpected verification origin.');
    const saved = { origin, device, expiresAt: Date.now() + device.expires_in * 1000 };
    await store.write(saved);
    state = pending.safeParse(saved);
  }
  if (!state.success) throw platformFailure('Login state is unavailable. Start login again.');
  const saved = state.data;
  if (options.has('--start') || (!reporter.canPrompt && !options.has('--resume'))) {
    emit({
      status: 'authorization_required',
      verificationUrl: saved.device.verification_uri_complete,
      userCode: saved.device.user_code,
      expiresAt: new Date(saved.expiresAt).toISOString(),
      nextAction:
        'Approve in your browser, then run anhedral login --resume with the same API origin and credential store.',
    });
    return;
  }
  reporter.diagnostic(
    `Approve CLI access at ${saved.device.verification_uri_complete}\nConfirm code ${saved.device.user_code}.`,
  );
  let interval = saved.device.interval * 1000;
  while (Date.now() < saved.expiresAt) {
    await (sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(interval);
    const result = await request('/auth/token', 'POST', {
      device_code: saved.device.device_code,
    });
    const grant = cliLoginSchema.safeParse(result);
    if (grant.success) {
      await store.write({ ...grant.data, origin });
      emit({ status: 'authenticated', origin, expiresAt: grant.data.expiresAt });
      return;
    }
    const error = (result as { error: string }).error;
    if (error === 'slow_down') interval += 5000;
    else if (error !== 'authorization_pending') {
      await store.clear();
      throw platformFailure('Device approval was denied or expired. Start login again.');
    }
  }
  await store.clear();
  throw platformFailure('Device approval expired. Start login again.');
}
