import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function forgeProbe(root, expectedPatched) {
  const assert = require('node:assert/strict');
  const crypto = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 65537 });
  const pem = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const results = [];
  for (const entry of ['lib/index.js', 'dist/forge.min.js', 'dist/forge.all.min.js']) {
    let forge;
    if (entry.startsWith('dist/')) {
      const sandbox = { console, setTimeout, clearTimeout, jQuery: undefined };
      sandbox.self = sandbox;
      sandbox.window = sandbox;
      vm.runInNewContext(fs.readFileSync(path.join(root, entry), 'utf8'), sandbox, {
        timeout: 1000,
      });
      forge = sandbox.forge;
    } else forge = require(path.join(root, entry));
    forge.options.usePureJavaScript = true;
    assert.equal(forge.options.usePureJavaScript, true);
    const key = forge.pki.publicKeyFromPem(pem);
    const asn1 = forge.asn1;
    const node = (type, value, constructed = false) =>
      asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
    let valid = 0,
      rejected = 0,
      acceptedMalformed = 0;
    for (const algorithm of ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512']) {
      const digest = crypto.createHash(algorithm).update('Anhedral RSA fixture').digest();
      const oid = () => node(asn1.Type.OID, asn1.oidToDer(forge.oids[algorithm]).getBytes());
      const nil = (value = '') => node(asn1.Type.NULL, value);
      const garbage = () => node(asn1.Type.OCTETSTRING, 'unconsumed');
      const verify = (parameters, outer = []) => {
        const info = node(
          asn1.Type.SEQUENCE,
          [
            node(asn1.Type.SEQUENCE, parameters, true),
            node(asn1.Type.OCTETSTRING, digest.toString('binary')),
            ...outer,
          ],
          true,
        );
        const der = Buffer.from(asn1.toDer(info).getBytes(), 'binary');
        const encoded = Buffer.concat([
          Buffer.from([0, 1]),
          Buffer.alloc(256 - der.length - 3, 255),
          Buffer.from([0]),
          der,
        ]);
        const signature = crypto.privateEncrypt(
          { key: keys.privateKey, padding: crypto.constants.RSA_NO_PADDING },
          encoded,
        );
        return key.verify(digest.toString('binary'), signature.toString('binary'));
      };
      assert.equal(verify([oid(), nil()]), true, `${entry}:${algorithm}:validNULL`);
      valid++;
      if (algorithm !== 'md5') {
        assert.equal(verify([oid()]), true, `${entry}:${algorithm}:validAbsent`);
        valid++;
      }
      for (const [parameters, outer] of [
        [[oid(), nil(), garbage()], []],
        [[oid(), garbage()], []],
        [[oid(), nil('garbage')], []],
        [[oid(), nil('\0')], []],
        [[oid(), nil()], [garbage()]],
      ]) {
        try {
          const accepted = verify(parameters, outer);
          if (accepted) acceptedMalformed++;
          else rejected++;
        } catch (error) {
          assert.match(error.message, /valid RSASSA-PKCS1-v1_5 DigestInfo/);
          rejected++;
        }
      }
    }
    if (expectedPatched) {
      assert.equal(acceptedMalformed, 0, entry);
      assert.equal(rejected, 30, entry);
    } else assert.ok(acceptedMalformed > 0, `${entry}:baseline vulnerability must reproduce`);
    results.push({ entry, forcePureJavaScript: true, valid, rejected, acceptedMalformed });
  }
  console.log(JSON.stringify(results));
}

export function verifyForge(directory, expectedPatched = true) {
  const result = spawnSync(
    process.execPath,
    ['-e', `(${forgeProbe.toString()})(process.argv[1],${expectedPatched})`, directory],
    { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
