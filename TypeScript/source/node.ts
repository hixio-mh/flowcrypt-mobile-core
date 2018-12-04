/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="./types/openpgp.d.ts" />
/// <reference path="./types/jquery.d.ts" />
/// <reference path="./types/android.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/chrome/index.d.ts" />

'use strict';

import { Pgp } from './core/pgp.js';
import * as https from 'https';
import { IncomingMessage } from 'http';

declare let openpgp: typeof OpenPGP;
declare const NODE_SSL_KEY: string, NODE_SSL_CRT: string, NODE_SSL_CA: string;

const KEY_2048 = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: FlowCrypt [BUILD_REPLACEABLE_VERSION] Gmail Encryption
Comment: Seamlessly send and receive encrypted email

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
=15Xc
-----END PGP PRIVATE KEY BLOCK-----`;

const KEY_4096 = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: FlowCrypt  Email Encryption - flowcrypt.com
Comment: Seamlessly send, receive and search encrypted email

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
Dn6h
=5aR+
-----END PGP PRIVATE KEY BLOCK-----`;

const KEY_25519 = `-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: FlowCrypt 6.3.5 Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxYYEXAZt6RYJKwYBBAHaRw8BAQdAHk2PLEMfkVLjxI6Vdg+dnJ5ElKcAX78x\nP+GVCYDZyfL+CQMI1riV1EDicFNg4/f/0U/ZJZ9udC0F7GvtFKagL3EIqz6f\nm+bm2E5qdDdyM2Z/7U2YOOVPc/HBxTg9SHrCTAYmfLtXEwU21uRzKIW9Y6N0\nLs0RdXNyIDx1c3JAdXNyLmNvbT7CdwQQFgoAKQUCXAZt6QYLCQcIAwIJEAY2\nNbPjPrFMBBUICgIDFgIBAhkBAhsDAh4BAADkfQD/cn4xmKOznw6jXw7m9jfe\nzABESbvxpAsBSL0lYyTF1g4BAPYKXnzBAMOjLHZ+CZL01A5I435MJoZ8ho+V\n233bcqoPx4sEXAZt6RIKKwYBBAGXVQEFAQEHQGqQsqsYFqSb8xU2Jy+m0ofh\nztR2KR1ukc+V+Daytv91AwEIB/4JAwhPqxwBR+9JFWD07K5gQ/ahdz6fd7jf\npiGAGZfJc3qN/W9MTqZcsl0qIiM4IaMeAuqlqm5xVHSHA3r7SnyfGtzDURM+\nc9pzQRYLwp33TgHXwmEEGBYIABMFAlwGbekJEAY2NbPjPrFMAhsMAACUKwD+\nMQFdjWEZwfAnJZQWLx3jpFxNyuKjUER5hRfphIXGeqUA/0wqTCpbBWQlcwml\n8jqIREq1Q/lDO3/9QPULKioe2ZoM\r\n=8qZ6\r\n-----END PGP PRIVATE KEY BLOCK-----\r\n", publicKeyArmored: "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 6.3.5 Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxjMEXAZt6RYJKwYBBAHaRw8BAQdAHk2PLEMfkVLjxI6Vdg+dnJ5ElKcAX78x\nP+GVCYDZyfLNEXVzciA8dXNyQHVzci5jb20+wncEEBYKACkFAlwGbekGCwkH\nCAMCCRAGNjWz4z6xTAQVCAoCAxYCAQIZAQIbAwIeAQAA5H0A/3J+MZijs58O\no18O5vY33swAREm78aQLAUi9JWMkxdYOAQD2Cl58wQDDoyx2fgmS9NQOSON+\nTCaGfIaPldt923KqD844BFwGbekSCisGAQQBl1UBBQEBB0BqkLKrGBakm/MV\nNicvptKH4c7UdikdbpHPlfg2srb/dQMBCAfCYQQYFggAEwUCXAZt6QkQBjY1\ns+M+sUwCGwwAAJQrAP4xAV2NYRnB8CcllBYvHeOkXE3K4qNQRHmFF+mEhcZ6\npQD/TCpMKlsFZCVzCaXyOohESrVD+UM7f/1A9QsqKh7Zmgw=\r\n=WZgv\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n", revocationCertificate: "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 6.3.5 Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\nComment: This is a revocation certificate\r\n\r\nwmEEIBYKABMFAlwGbekJEAY2NbPjPrFMAh0AAACUaQD/c9eod5CrHQ0b79gF\nTVLvdGmInmhFoDOMsO69uHpAyToBAPEEApEycDN9rktUU1k/qSjV1zkWAjQ2\ndfQw8KTe8zYE\r\n=Ogjo\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n`;

const fmtErr = (e: any): string => {
  return JSON.stringify({
    error: {
      message: String(e),
      stack: e && typeof e === 'object' ? e.stack || '' : ''
    }
  });
};

const newBigString = (mb: number): string => {
  return new Array(mb * 1024 * 1024 / 2).join('x'); // in js, each character is a 16-bit value
}

const handleReq = async (r: IncomingMessage): Promise<string> => {
  if (r.url === '/version') {
    return JSON.stringify(process.versions);
  } else if (r.url === '/hash') {
    return Pgp.hash.sha256('hello');
  } else if (r.url === '/test25519') {
    return await testEncryptDecrypt(KEY_25519, 'encrypt this string');
  } else if (r.url === '/test2048') {
    return await testEncryptDecrypt(KEY_2048, 'encrypt this string');
  } else if (r.url === '/test4096') {
    return await testEncryptDecrypt(KEY_4096, 'encrypt this string');
  } else if (r.url === '/test2048-1M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(1));
  } else if (r.url === '/test2048-3M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(3));
  } else if (r.url === '/test2048-5M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(5));
  } else if (r.url === '/test2048-10M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(10));
  } else if (r.url === '/test2048-25M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(25));
  } else if (r.url === '/test2048-50M') {
    return await testEncryptDecrypt(KEY_2048, newBigString(50));
  } else {
    return `unknown path ${r.url}`;
  }
}

const testEncryptDecrypt = async (privateKeyArmored: string, data: string) => {

  let msg = '';

  let checkpoint = Date.now();
  const measure = (name: string) => {
    const now = Date.now();
    msg += `${name}: ${now - checkpoint}ms, \n`;
    checkpoint = now;
  }

  const passphrase = 'some long pp';
  const prv = openpgp.key.readArmored(privateKeyArmored).keys[0];
  const pub = prv.toPublic();
  measure('key parsed');

  const encrypted = await openpgp.encrypt({ data, publicKeys: [pub] });
  // console.log(encrypted.data);
  measure('message encrypted');

  prv.decrypt(passphrase);
  measure('prv decrypted');

  await openpgp.decrypt({
    message: openpgp.message.readArmored((encrypted as any).data),
    privateKeys: [prv],
  })
  // console.log(decrypted.data);
  measure('message decrypted');

  msg += `${JSON.stringify(pub.primaryKey.getAlgorithmInfo())} (data:${Math.round(data.length / 512)}K),\n`;

  return msg;

}

https.createServer({ key: NODE_SSL_KEY, cert: NODE_SSL_CRT, ca: NODE_SSL_CA }, (request, response) => {
  handleReq(request).then((r) => {
    console.log(r);
    response.end(r);
  }).catch((e) => {
    response.end(fmtErr(e));
  });
}).listen(3000, 'localhost');
