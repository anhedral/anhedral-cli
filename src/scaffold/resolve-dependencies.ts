import { spawnSync } from 'node:child_process';
import { parse } from 'jsonc-parser';
import semver from 'semver';
import type { CapabilityEditor } from '../composition/editor.js';
import {
  WEB_DEPENDENCIES,
  templateDependencyRange,
  STACK_DEPENDENCIES,
  CLIENT_DEPENDENCIES,
  ANHEDRAL_STACK_DEPENDENCIES,
  CAPABILITY_DEPENDENCIES,
} from '../dependencies.js';
import {
  npmReleases,
  crateReleases,
  selectReleases,
  type Registry,
  type Release,
} from '../registry/releases.js';

const runtimePackages = new Set([
  ...Object.keys(WEB_DEPENDENCIES.dependencies!),
  ...Object.keys(WEB_DEPENDENCIES.devDependencies!),
  ...Object.keys(STACK_DEPENDENCIES),
  ...Object.keys(CLIENT_DEPENDENCIES),
  ...Object.keys(ANHEDRAL_STACK_DEPENDENCIES),
  ...Object.keys(CAPABILITY_DEPENDENCIES),
]);
const sections = ['dependencies', 'devDependencies'] as const;
type Pin = { name: string; range: string; field?: string[]; existing?: boolean };
interface ManifestPins {
  pins: Map<string, Pin>;
  external: Map<string, string>;
}

function packagePins(
  editor: CapabilityEditor,
  file: string,
  initializing: boolean,
  template?: CapabilityEditor,
): ManifestPins | undefined {
  const manifest = editor.json(file);
  const baseline = template?.json(file);
  const original = editor.before.get(file);
  const before = original && !initializing ? parse(original) : {};
  const pins = new Map<string, Pin>();
  const external = new Map<string, string>();
  for (const section of sections) {
    for (const [name, value] of Object.entries(manifest[section] ?? {})) {
      if (typeof value !== 'string') continue;
      const existing = Object.hasOwn(before[section] ?? {}, name);
      if (
        !runtimePackages.has(name) ||
        (template && !Object.hasOwn(baseline?.[section] ?? {}, name)) ||
        (existing &&
          (!semver.validRange(value) || (semver.valid(value) && semver.prerelease(value))))
      ) {
        // Keep workspace links, private packages and custom sources local. Published
        // packages can constrain an existing peer without looking it up in a registry.
        external.set(name, value);
        continue;
      }
      const floor = baseline?.[section]?.[name];
      const update =
        typeof floor === 'string' &&
        semver.valid(value) &&
        !semver.prerelease(value) &&
        semver.intersects(templateDependencyRange(name, floor), '^' + value);
      if (update) {
        pins.set(name, {
          name,
          range: templateDependencyRange(name, floor)
            .split('||')
            .map((range) => range.trim() + ' >=' + value)
            .join(' || '),
          field: [section, name],
        });
      } else if (existing || template) {
        pins.set(name, { name, range: value, existing: true });
      } else {
        if (!semver.valid(value))
          throw Error('Invalid dependency baseline for ' + name + ' in ' + file);
        pins.set(name, {
          name,
          range: templateDependencyRange(name, value),
          field: [section, name],
        });
      }
    }
  }
  if (file === 'package.json' && (initializing || template)) {
    const current = /^pnpm@(\d+\.\d+\.\d+)$/.exec(manifest.packageManager ?? '')?.[1];
    const floor = (baseline ?? manifest).packageManager.slice('pnpm@'.length);
    if (current && semver.intersects('^' + current, '^' + floor))
      pins.set('pnpm', {
        name: 'pnpm',
        range: '^' + floor + ' >=' + current,
        field: ['packageManager'],
      });
  }
  if (![...pins.values()].some((pin) => pin.field)) return;
  if (file === 'apps/mobile/package.json' && pins.has('expo')) {
    // Expo publishes the compatible React and React Native versions in its SDK template.
    pins.set('expo-template-blank', {
      name: 'expo-template-blank',
      range: String(semver.minVersion(pins.get('expo')!.range)!.major) + '.x',
    });
  }
  return { pins, external };
}

export interface DependencyPin {
  file: string;
  section: string;
  name: string;
  current: string;
  proposed: string;
}
export interface ResolutionOptions {
  initializing?: boolean;
  template?: CapabilityEditor;
  registry?: Registry;
  crates?: typeof crateReleases;
}

export async function pinGeneratedDependencies(
  editor: CapabilityEditor,
  options: ResolutionOptions = {},
) {
  const {
    initializing = false,
    template,
    registry = npmReleases,
    crates = crateReleases,
  } = options;
  const changes: DependencyPin[] = [];
  const files = new Set(
    [...(template ?? editor).writes.keys()].filter(
      (file) => file.endsWith('/package.json') || file === 'package.json',
    ),
  );
  if (initializing || template) files.add('package.json');
  const manifests = new Map<string, ManifestPins>();
  const needed = new Set<string>();
  for (const file of files) {
    if (template && editor.read(file) === null) continue;
    const manifest = packagePins(editor, file, initializing, template);
    if (!manifest) continue;
    manifests.set(file, manifest);
    for (const name of manifest.pins.keys()) needed.add(name);
  }
  const releases = new Map<string, Release[]>();
  const queue = [...needed];
  async function load() {
    for (;;) {
      const name = queue.shift();
      if (!name) return;
      try {
        releases.set(name, await registry(name));
      } catch (error) {
        queue.length = 0;
        throw error;
      }
    }
  }
  const requests = await Promise.allSettled(
    Array.from({ length: Math.min(4, queue.length) }, load),
  );
  for (const request of requests) if (request.status === 'rejected') throw request.reason;
  for (const [file, { pins, external }] of manifests) {
    const candidates = new Map<string, Release[]>();
    for (const pin of pins.values()) {
      const choices = releases.get(pin.name)!.filter((entry) => {
        if (
          !semver.valid(entry.version) ||
          semver.prerelease(entry.version) ||
          !semver.satisfies(entry.version, pin.range)
        )
          return false;
        if (entry.engines?.node && !semver.satisfies(process.versions.node, entry.engines.node))
          return false;
        for (const [peer, range] of Object.entries(entry.peerDependencies ?? {})) {
          const declared = external.get(peer);
          if (
            declared &&
            range !== '*' &&
            !(
              semver.validRange(declared) &&
              semver.validRange(range) &&
              semver.intersects(declared, range)
            )
          )
            return false;
        }
        return !entry.deprecated || (pin.existing && pin.range === entry.version);
      });
      if (!choices.length)
        throw Error(
          'No compatible stable ' +
            pin.name +
            ' release for ' +
            pin.range +
            ' and Node ' +
            process.versions.node +
            ' in ' +
            file,
        );
      candidates.set(pin.name, choices);
    }
    const selected = selectReleases(candidates, file);
    for (const [name, release] of selected) {
      const field = pins.get(name)!.field;
      if (!field) continue;
      const pkg = editor.json(file);
      const manager = field[0] === 'packageManager';
      const current = manager ? pkg.packageManager.slice(5) : pkg[field[0]][name];
      if (template || current !== release.version)
        changes.push({ file, section: field[0], name, current, proposed: release.version });
      if (current === release.version) continue;
      editor.set(file, field, manager ? 'pnpm@' + release.version : release.version);
    }
  }
  const cargo = 'apps/desktop/src-tauri/Cargo.toml';
  const source = template
    ? template.writes.has(cargo)
      ? editor.read(cargo)
      : null
    : editor.writes.get(cargo);
  if (source && (template || !editor.before.get(cargo))) {
    const compiler = spawnSync('rustc', ['--version'], { encoding: 'utf8', timeout: 3000 });
    const rust =
      compiler.status === 0 ? /rustc (\d+\.\d+\.\d+)/.exec(compiler.stdout)?.[1] : undefined;
    const candidates = new Map<string, Release[]>();
    const pins = new Map<string, { current: string; offset: number; section: string }>();
    let section = '';
    let offset = 0;
    for (const line of source.split('\n')) {
      if (line.trimStart().startsWith('[')) section = line.trim().split(']')[0].slice(1);
      const match =
        /^\s*(tauri|tauri-build)\s*=\s*(?:"=(\d+\.\d+\.\d+)"|\{[^}]*?\bversion\s*=\s*"=(\d+\.\d+\.\d+)")/.exec(
          line,
        );
      if (
        match &&
        section === (match[1] === 'tauri' ? 'dependencies' : 'build-dependencies') &&
        !/\b(?:path|git|workspace)\s*=/.test(line.split('#')[0])
      ) {
        const name = match[1] as 'tauri' | 'tauri-build';
        const current = match[2] ?? match[3];
        const floor =
          template?.read(cargo)?.match(new RegExp('^' + name + ' = "=(.*?)"$', 'm'))?.[1] ??
          current;
        if (semver.intersects('^' + floor, '^' + current)) {
          if (pins.has(name)) throw Error('Duplicate Rust dependency ' + name);
          pins.set(name, { current, section, offset: offset + match[0].lastIndexOf(current) });
          const releases = await crates(name, rust);
          candidates.set(
            name,
            releases.filter((row) => semver.satisfies(row.version, '^' + floor + ' >=' + current)),
          );
        }
      }
      offset += line.length + 1;
    }
    let updated = source;
    const selected = selectReleases(candidates, cargo);
    for (const [name, pin] of [...pins].reverse()) {
      const proposed = selected.get(name)!.version;
      if (template || proposed !== pin.current)
        changes.push({ file: cargo, section: pin.section, name, current: pin.current, proposed });
      if (proposed === pin.current) continue;
      updated =
        updated.slice(0, pin.offset) + proposed + updated.slice(pin.offset + pin.current.length);
    }
    if (updated !== source) editor.writes.set(cargo, updated);
  }
  return changes.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.section.localeCompare(b.section) ||
      a.name.localeCompare(b.name),
  );
}
