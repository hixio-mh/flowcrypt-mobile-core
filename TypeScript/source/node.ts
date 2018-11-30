/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="./types/openpgp.d.ts" />
/// <reference path="./types/jquery.d.ts" />
/// <reference path="./types/android.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/chrome/index.d.ts" />

'use strict';

import { Pgp } from './core/pgp.js';
import * as http from 'http';

declare let openpgp: typeof OpenPGP;

var versions_server = http.createServer((request, response) => {
  let r = '';
  r += `node.js:v1: ${JSON.stringify(process.versions)}\n\n`;
  r += `hello-hash: ${Pgp.hash.sha256('hello')}\n\n`;
  test_openpgp().then(success => response.end(r + success), fail => response.end(r + fail));
});

const test_openpgp = async () => {

  let msg = '';

  let checkpoint = Date.now();
  const measure = (name: string) => {
    const now = Date.now();
    msg += `${name}: ${now - checkpoint}ms\n`;
    checkpoint = now;
  }

  const data = 'Hello FlowCrypt Please encrypt THIS';
  const passphrase = 'some long pp';

  // const { privateKeyArmored, publicKeyArmored } = await openpgp.generateKey({ userIds: [{ name: 'Test', email: 't@est.com' }], numBits: 2048, passphrase });
  // console.log(privateKeyArmored);
  // console.log(publicKeyArmored);
  // measure('key generated')

  const privateKeyArmored = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: FlowCrypt [BUILD_REPLACEABLE_VERSION] Gmail Encryption
Comment: Seamlessly send and receive encrypted email

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
=15Xc
-----END PGP PRIVATE KEY BLOCK-----`;

  const encrypted = await openpgp.encrypt({ data, publicKeys: [openpgp.key.readArmored(privateKeyArmored).keys[0].toPublic()] });
  // console.log(encrypted.data);
  measure('message encrypted')

  const prv = openpgp.key.readArmored(privateKeyArmored).keys[0];
  prv.decrypt(passphrase);
  measure('prv decrypted')

  await openpgp.decrypt({
    message: openpgp.message.readArmored((encrypted as any).data),
    privateKeys: [prv],
  })
  // console.log(decrypted.data);
  measure('message decrypted')

  return msg;

}

versions_server.listen(3000, 'localhost');
