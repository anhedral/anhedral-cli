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
        result = subprocess.run([
            os.environ.get('GITLEAKS_BINARY', 'gitleaks'), 'git',
            '--config', str(config), '--gitleaks-ignore-path', '.github/secret-safety-baseline.txt',
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
