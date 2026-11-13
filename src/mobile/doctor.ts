import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readBoundedFile } from '../bounded-file.ts';

type Check = { id: string; status: 'pass' | 'blocked' | 'unknown'; message: string };
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const declaredMajor = (value: unknown) =>
  typeof value === 'string' ? /^[~^]?(\d+)\.\d+\.\d+$/.exec(value)?.[1] : undefined;

/** Offline inspection only: never evaluates app config, imports packages or runs project scripts. */
export function inspectMobileProject(cwd: string, directory = 'apps/mobile') {
  const root = realpathSync(cwd);
  const requested = path.resolve(root, directory);
  const relative = path.relative(root, requested);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative))
    throw Error('Select a mobile app directory inside the working directory.');
  const checks: Check[] = [];
  const add = (id: string, status: Check['status'], message: string) =>
    checks.push({ id, status, message });
  if (!existsSync(requested)) {
    add('app-directory', 'blocked', 'Mobile source is missing. Select an existing Expo app.');
  } else {
    // Refuse every linked directory component, including links back inside the workspace.
    let current = root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (lstatSync(current).isSymbolicLink())
        throw Error('Mobile app directories must not be links.');
    }
    if (!lstatSync(requested).isDirectory()) throw Error('Select a mobile app directory.');
    const read = (file: string): ObjectValue | undefined => {
      try {
        const value: unknown = JSON.parse(
          readBoundedFile(path.join(requested, file), 256 * 1024).toString('utf8'),
        );
        if (value === null || typeof value !== 'object' || Array.isArray(value)) throw Error();
        return value as ObjectValue;
      } catch {
        add(
          file,
          'blocked',
          `Provide a regular, bounded, valid ${file}; its contents were not evaluated or printed.`,
        );
        return undefined;
      }
    };
    const manifest = read('package.json');
    if (manifest) {
      const deps = object(manifest.dependencies);
      add(
        'expo-sdk',
        declaredMajor(deps.expo) === '58' ? 'pass' : 'blocked',
        'The initial feasibility profile targets an explicit Expo SDK 58 dependency.',
      );
      add(
        'router',
        Number(declaredMajor(deps['expo-router'])) >= 57 ? 'pass' : 'blocked',
        'Source-aware Explore review requires the supported Expo Router profile (57 or newer).',
      );
      add(
        'development-client',
        declaredMajor(deps['expo-dev-client']) !== undefined ? 'pass' : 'blocked',
        'Fast Refresh on a custom native build requires expo-dev-client.',
      );
    }
    const dynamic = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'].some(
      (file) => existsSync(path.join(requested, file)),
    );
    if (dynamic) {
      add(
        'app-config',
        'unknown',
        'Dynamic Expo config requires isolated runtime inspection; no config was executed.',
      );
    } else {
      const config = read('app.json');
      if (config) {
        const expo = object(config.expo);
        const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
        const projectId = object(object(expo.extra).eas).projectId;
        add(
          'expo-project',
          typeof projectId === 'string' && uuid.test(projectId) ? 'pass' : 'blocked',
          'An explicit Expo project ID is required for the hosted proof; source does not prove account access.',
        );
        for (const [platform, key] of [
          ['ios', 'bundleIdentifier'],
          ['android', 'package'],
        ] as const) {
          const identifier = object(expo[platform])[key];
          add(
            `${platform}-identity`,
            typeof identifier === 'string' &&
              (platform === 'ios'
                ? /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/
                : /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/
              ).test(identifier)
              ? 'pass'
              : 'blocked',
            `Declare a stable ${platform} application identifier.`,
          );
        }
      }
    }
    const eas = read('eas.json');
    if (eas) {
      const profiles = Object.values(object(eas.build)).map(object);
      const custom = (profile: ObjectValue) =>
        'config' in profile ||
        ['gradleCommand', 'buildConfiguration', 'developmentClient', 'config'].some(
          (key) => key in object(profile.android) || key in object(profile.ios),
        );
      const direct = profiles.filter((profile) => !profile.extends && !custom(profile));
      const inherited = profiles.some((profile) => profile.extends || custom(profile));
      const profileCheck = (id: string, matches: boolean, message: string) =>
        add(id, matches ? 'pass' : inherited ? 'unknown' : 'blocked', message);
      profileCheck(
        'ios-development-build',
        direct.some((p) => p.developmentClient === true && object(p.ios).simulator === true),
        'Provide a development-client profile with ios.simulator enabled; inherited profiles need runtime resolution.',
      );
      profileCheck(
        'android-review-build',
        direct.some(
          (p) =>
            (p.developmentClient === undefined || p.developmentClient === false) &&
            object(p.android).buildType === 'apk',
        ),
        'Explore needs a fixed Android APK profile, separate from the development client.',
      );
      profileCheck(
        'ios-review-build',
        direct.some(
          (p) =>
            (p.developmentClient === undefined || p.developmentClient === false) &&
            object(p.ios).simulator === true,
        ),
        'Explore needs a fixed iOS simulator profile, separate from the development client.',
      );
    }
  }
  return {
    schemaVersion: 1,
    scope: 'source-only' as const,
    status: checks.some((c) => c.status === 'blocked')
      ? 'blocked'
      : checks.some((c) => c.status === 'unknown')
        ? 'incomplete'
        : 'source-ready',
    checks,
    runtimeAcceptance: 'not-evaluated',
    hostedAdmission: false,
    resourcesProvisioned: false,
    nextAction:
      'Review source findings, then separately verify toolchain, Expo access, build, native auth, transport and cleanup.',
  };
}
