#!/usr/bin/env python3
"""CI commit-range guard. Never prints file contents or credential values."""
import os
import pathlib
import re
import subprocess
import sys
import tempfile


def git(*args):
    return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL)


def reject(message):
    raise ValueError(message)


def check_file(commit, name):
    path = pathlib.PurePosixPath(name)
    base = path.name.lower()
    known_public = {
        'packages/platform-contracts/scripts/test-cli-source.mjs': 'b3250e44c61414d534cc9d11004c0898da0f3109',
        'packages/ui/assets/brand/anhedral-brand-assets.zip': 'a1d45d27bbbc2eef0c734bdc8337a2cd3d37fe15',
    }
    # Existing negative-test marker and public brand bundle, exact immutable blobs.
    # Any changed bytes lose this exception; credential scanning still applies.
    if name in known_public and git('rev-parse', commit + ':' + name).decode().strip() == known_public[name]:
        return
    forbidden = {'.artifacts', '.wrangler', '.vercel', '.anhedral', '.ssh', '.aws',
                 'node_modules', '.next', '.open-next', '.turbo', 'coverage',
                 'playwright-report', 'test-results'}
    if (any(part.lower() in forbidden for part in path.parts)
        or (base.startswith(('.env', '.dev.vars'))
            and not base.endswith(('.example', '.sample', '.template')))
        or base.startswith('.pgpass')
        or base in {'id_rsa', 'id_ed25519', 'credentials.json', 'service-account.json'}
        or re.search(r'\.(?:dump|backup|bak|sqlite\d*|db|log|zip|tar|tgz|7z|pem|key|p12|pfx|jks|keystore|har)(?:\.gz)?$', base)
        or base.endswith(('.sql.gz', '.sql.zip'))):
        reject('private/generated file: ' + ascii(name))
    obj = commit + ':' + name
    if int(git('cat-file', '-s', obj)) > 10 * 1024 * 1024:
        reject('file exceeds10MiB review limit: ' + ascii(name))
    data = git('show', obj)
    if (data.startswith(b'PGDMP') or re.search(rb'(?m)^-- PostgreSQL database dump(?:\r?\n|$)', data[:2048])
        or re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----', data)):
        reject('database dump or private key: ' + ascii(name))


def reviewed_checksum_fingerprints(revision):
    # Generated auth-platform.ts checksums. Merge and squash commits change
    # Gitleaks commit fingerprints even when these reviewed blobs are identical.
    manifests = {
        'examples/02-backend/anhedral.json': (43, {'7a657ef07b251c2f8ede786c6a532c9cd3453e11'}),
        'examples/03-storage/anhedral.json': (45, {'f6d8280f2ffea7af3a44f6d91c6be0be3f1ec254'}),
        'examples/04-payments/anhedral.json': (47, {'18f0b9f67ea18f72ffd7905a72cdcb4eea07b315'}),
        'examples/04-payment/anhedral.json': (47, {'18f0b9f67ea18f72ffd7905a72cdcb4eea07b315'}),
        'examples/05-init-all/anhedral.json': (53, {'3e5b577bbd1cb963c87800ceef1c758b77f2c930', '5b2ace5422dd50f733307a74d26809881dc852f7'}),
        'examples/progression/04-auth/anhedral.json': (36, {'e6149e7f24fb0e3822527318124d00365846526a', 'e15e85ee925ab9d568938ca8ced8f0b53b56a9e4'}),
        'examples/progression/05-mobile/anhedral.json': (37, {'890b1bb83a9d7fe35e43e941cd3af1dede33e8c5', '0ac6d7763287e2cef57d0ea8bfff8b2ab814445b'}),
        'examples/progression/06-desktop/anhedral.json': (38, {'a3c45d54df7acf4049f9b07da2ed94e2af65b8fc', 'c8fb7f91b079b513599785546f1261dc24491c14'}),
        'examples/progression/07-web-extension/anhedral.json': (39, {'310e657ab7d20f7af01a5dcfdb17b87d31702ae9', 'c92375563bdc97d31ce40c2f21d21d7cdbee4c0d'}),
        'examples/progression/08-storage/anhedral.json': (40, {'038364b2ac94ec316ff8203af05e71350b5bcdae', '464e478d64e24c8a0c4b4c7b90676ff28dd01098'}),
        'examples/progression/09-client-sync/anhedral.json': (41, {'a780ee3aebaf424c82a51e12a0cecb59195608b2', 'f6c4fe58741ef879e693331b1bd6e5c535004c0e'}),
        'examples/progression/10-cli/anhedral.json': (42, {'50f51e2cd472ef9c1a5812d8a3e1b4dd4ec0871a', 'eb7022d4ebd16bf28be67e0d278dd4db67b22773'}),
        'examples/progression/11-payment/anhedral.json': (43, {'a6ee9c728f716ab93fbfaf872e516654055a6d38', 'cba232dd481c94f7631f5e9e03433f125873b2a8'}),
        'examples/progression/12-in-app-purchases/anhedral.json': (44, {'69bafcbb5a800f41d5647380798d4a26afcf0bd4', '81adb7a1476045fc745b6502396982a6658bcb06'}),
        'examples/progression/13-rtc/anhedral.json': (45, {'f996d3e0126a88a5c5a9f7d05ca8aade7f8c488b', '5b7dfaeaaf1b1d60753c0462d6609a2a01332e66'}),
    }
    history = git('log', '--full-history', '-m', '--raw', '--no-renames', '--no-abbrev',
                  '--format=%H', revision, '--', *manifests).decode().splitlines()
    commit = None
    for row in history:
        if re.fullmatch('[a-f0-9]{40}', row):
            commit = row
        elif row.startswith(':'):
            metadata, name = row.split('\t', 1)
            line, reviewed_blobs = manifests[name]
            if commit and metadata.split()[3] in reviewed_blobs:
                yield f'{commit}:{name}:generic-api-key:{line}'


def main():
    base = os.environ.get('SECRET_SCAN_BASE', '')
    if base and base != '0' * 40:
        if not re.fullmatch(r'[a-f0-9]{40}', base):
            reject('invalid comparison revision')
        git('merge-base', '--is-ancestor', base, 'HEAD')
        revision = base + '..HEAD'
    else:
        revision = 'HEAD'
    commits = git('rev-list', revision).decode().splitlines() if base and base != '0' * 40 else []
    if not commits and (not base or base == '0' * 40):
        for name in git('ls-tree', '-r', '--name-only', '-z', 'HEAD').split(b'\0'):
            if name:
                check_file('HEAD', name.decode('utf-8', 'surrogateescape'))
    for commit in commits:
        names = git('diff-tree', '--root', '--no-commit-id', '--name-only',
                    '--diff-filter=ACMT', '-m', '-r', '-z', commit).split(b'\0')
        for name in set(names) - {b''}:
            check_file(commit, name.decode('utf-8', 'surrogateescape'))
    # Explicit config and immutable pre-existing fingerprints only. Inline allow
    # comments and repository-provided rule overrides cannot disable this scan.
    with tempfile.TemporaryDirectory() as directory:
        config = pathlib.Path(directory) / 'gitleaks.toml'
        config.write_text('[extend]\nuseDefault = true\n')
        baseline = pathlib.Path(directory) / 'reviewed-fingerprints'
        baseline.write_text(pathlib.Path('.github/secret-safety-baseline.txt').read_text()
                            + '\n' + '\n'.join(reviewed_checksum_fingerprints(revision)) + '\n')
        result = subprocess.run([
            os.environ.get('GITLEAKS_BINARY', 'gitleaks'), 'git',
            '--config', str(config), '--gitleaks-ignore-path', str(baseline),
            '--ignore-gitleaks-allow', '--redact=100', '--no-banner', '--no-color',
            '--log-opts=-m ' + revision, '.'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode:
            reject('credential scan failed; inspect privately, never paste key values into CI logs')
    print('Secret safety passed: credential patterns and private-file admission')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print('Secret safety blocked: ' + (str(error) if isinstance(error, ValueError)
                                         else 'scan could not complete'), file=sys.stderr)
        sys.exit(1)
