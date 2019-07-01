/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import * as ava from 'ava';
import { startNodeCoreInstance, request, expectNoData, getKeypairs, expectData, expectEmptyJson, getCompatAsset } from './test/test-utils';
import { expect } from 'chai';
import { ChildProcess } from './test/flowcrypt-node-modules';
import { requireOpenpgp } from './platform/require';

const htmlContent = 'some\n汉\ntxt'.replace(/\n/g, '<br>');

const openpgp = requireOpenpgp();

let nodeProcess: ChildProcess;

ava.test.before(async t => {
  nodeProcess = await startNodeCoreInstance(t);
  t.pass();
});

ava.test('version', async t => {
  const { json, data } = await request('version', {}, []);
  expect(json).to.have.property('node');
  expectNoData(data);
  t.pass();
});

ava.test('doesnotexist', async t => {
  const { data, err } = await request('doesnotexist', {}, [], false);
  expect(err).to.equal('Error: unknown endpoint: doesnotexist');
  expectNoData(data);
  t.pass();
});

ava.test('generateKey', async t => {
  const { json, data } = await request('generateKey', { variant: 'curve25519', passphrase: 'riruekfhydekdmdbsyd', userIds: [{ email: 'a@b.com', name: 'Him' }] }, []);
  expect(json.key.private).to.contain('-----BEGIN PGP PRIVATE KEY BLOCK-----');
  expect(json.key.public).to.contain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
  expect(json.key.isDecrypted).to.be.false;
  expect(json.key.algo).to.deep.equal({ algorithm: 'eddsa', curve: 'ed25519', algorithmId: 22 });
  expectNoData(data);
  t.pass();
});

ava.test('encryptMsg -> parseDecryptMsg', async t => {
  const content = 'hello\nwrld';
  const { pubKeys, keys } = getKeypairs('rsa1');
  const { data: encryptedMsg, json: encryptJson } = await request('encryptMsg', { pubKeys }, content);
  expectEmptyJson(encryptJson);
  expectData(encryptedMsg, 'armoredMsg');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys }, encryptedMsg);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent: content.replace(/\n/g, '<br>') }]);
  t.pass();
});

ava.test('composeEmail format:plain -> parseDecryptMsg', async t => {
  const content = 'hello\nwrld';
  const { keys } = getKeypairs('rsa1');
  const req = { format: 'plain', text: content, to: ['some@to.com'], cc: ['some@cc.com'], bcc: [], from: 'some@from.com', subject: 'a subj' };
  const { data: plainMimeMsg, json: composeEmailJson } = await request('composeEmail', req, []);
  expectEmptyJson(composeEmailJson);
  const plainMimeStr = plainMimeMsg.toString();
  expect(plainMimeStr).contains('To: some@to.com');
  expect(plainMimeStr).contains('From: some@from.com');
  expect(plainMimeStr).contains('Subject: a subj');
  expect(plainMimeStr).contains('Cc: some@cc.com');
  expect(plainMimeStr).contains('Date: ');
  expect(plainMimeStr).contains('MIME-Version: 1.0');
  const { data: blocks, json: parseJson } = await request('parseDecryptMsg', { keys, isEmail: true }, plainMimeMsg);
  expect(parseJson).to.deep.equal({ replyType: 'plain' });
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'plain', htmlContent: content.replace(/\n/g, '<br>') }]);
  t.pass();
});

ava.test('composeEmail format:plain (reply)', async t => {
  const replyToMimeMsg = `Content-Type: multipart/mixed;
 boundary="----sinikael-?=_1-15535259519270.930031460416217"
To: some@to.com
From: some@from.com
Subject: Re: original
Date: Mon, 25 Mar 2019 14:59:11 +0000
Message-Id: <originalmsg@from.com>
MIME-Version: 1.0

------sinikael-?=_1-15535259519270.930031460416217
Content-Type: text/plain
Content-Transfer-Encoding: quoted-printable

orig message
------sinikael-?=_1-15535259519270.930031460416217--`
  const req = { format: 'plain', text: 'replying', to: ['some@to.com'], cc: [], bcc: [], from: 'some@from.com', subject: 'Re: original', replyToMimeMsg };
  const { data: mimeMsgReply, json } = await request('composeEmail', req, []);
  expectEmptyJson(json);
  const mimeMsgReplyStr = mimeMsgReply.toString();
  expect(mimeMsgReplyStr).contains('In-Reply-To: <originalmsg@from.com>');
  expect(mimeMsgReplyStr).contains('References: <originalmsg@from.com>');
  t.pass();
});

ava.test('composeEmail format:encrypt-inline -> parseDecryptMsg', async t => {
  const content = 'hello\nwrld';
  const { pubKeys, keys } = getKeypairs('rsa1');
  const req = { pubKeys, format: 'encrypt-inline', text: content, to: ['encrypted@to.com'], cc: [], bcc: [], from: 'encr@from.com', subject: 'encr subj' };
  const { data: encryptedMimeMsg, json: encryptJson } = await request('composeEmail', req, []);
  expectEmptyJson(encryptJson);
  const encryptedMimeStr = encryptedMimeMsg.toString();
  expect(encryptedMimeStr).contains('To: encrypted@to.com');
  expect(encryptedMimeStr).contains('MIME-Version: 1.0');
  expectData(encryptedMimeMsg, 'armoredMsg'); // armored msg block should be contained in the mime message
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, encryptedMimeMsg);
  expect(decryptJson).deep.equal({ replyType: 'encrypted' });
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent: content.replace(/\n/g, '<br>') }]);
  t.pass();
});

ava.test('encryptFile -> decryptFile', async t => {
  const { pubKeys, keys } = getKeypairs('rsa1');
  const name = 'myfile.txt';
  const content = Buffer.from([10, 20, 40, 80, 160, 0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  const { data: encryptedFile, json: encryptJson } = await request('encryptFile', { pubKeys, name }, content);
  expectEmptyJson(encryptJson);
  expectData(encryptedFile);
  const { data: decryptedContent, json: decryptJson } = await request('decryptFile', { keys }, encryptedFile);
  expect(decryptJson).to.deep.equal({ success: true, name });
  expectData(decryptedContent, 'binary', content);
  t.pass();
});

ava.test('parseDateStr', async t => {
  const { data, json } = await request('parseDateStr', { dateStr: 'Sun, 10 Feb 2019 07:08:20 -0800' }, []);
  expect(json).to.deep.equal({ timestamp: '1549811300000' });
  expectNoData(data);
  t.pass();
});

ava.test('gmailBackupSearch', async t => {
  const { data, json } = await request('gmailBackupSearch', { acctEmail: 'test@acct.com' }, []);
  expect(json).to.deep.equal({ query: 'from:test@acct.com to:test@acct.com (subject:"Your FlowCrypt Backup" OR subject: "Your CryptUp Backup" OR subject: "All you need to know about CryptUP (contains a backup)" OR subject: "CryptUP Account Backup") -is:spam' });
  expectNoData(data);
  t.pass();
});

ava.test('isEmailValid - true', async t => {
  const { data, json } = await request('isEmailValid', { email: 'test@acct.com' }, []);
  expect(json).to.deep.equal({ valid: true });
  expectNoData(data);
  t.pass();
});

ava.test('isEmailValid - false', async t => {
  const { data, json } = await request('isEmailValid', { email: 'testacct.com' }, []);
  expect(json).to.deep.equal({ valid: false });
  expectNoData(data);
  t.pass();
});

ava.test('parseKeys', async t => {
  const { pubKeys: [pubkey] } = getKeypairs('rsa1');
  const { data, json } = await request('parseKeys', {}, Buffer.from(pubkey));
  expect(json).to.deep.equal({
    "format": "armored",
    "keyDetails": [
      {
        "public": "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 0.0.1-dev Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxsBNBFwBWOEBB/9uIqBYIPDQbBqHMvGXhgnm+b2i5rNLXrrGoalrp7wYQ654\r\nZln/+ffxzttRLRiwRQAOG0z78aMDXAHRfI9d3GaRKTkhTqVY+C02E8NxgB3+\r\nmbSsF0Ui+oh1//LT1ic6ZnISCA7Q2h2U/DSAPNxDZUMu9kjh9TjkKlR81fiA\r\nlxuD05ivRxCnmZnzqZtHoUvvCqsENgRjO9a5oWpMwtdItjdRFF7UFKYpfeA+\r\nct0uUNMRVdPK7MXBEr2FdWiKN1K21dQ1pWiAwj/5cTA8hu5Jue2RcF8FcPfs\r\nniRihQkNqtLDsfY5no1B3xeSnyO2SES1bAHw8ObXZn/C/6jxFztkn4NbABEB\r\nAAHNEFRlc3QgPHRAZXN0LmNvbT7CwH8EEAEIACkFAlwBWOEGCwkHCAMCCRA6\r\nMPTMCpqPEAQVCAoCAxYCAQIZAQIbAwIeAQAKCRA6MPTMCpqPENaTB/0faBFR\r\n2k3RM7P427HyZOsZtqEPxuynsLUqmsAAup6LtPhir4CAsb5DSvgYrzC8pbrf\r\njCaodoB7hMXc8RxTbSh+vQc5Su4QwY8sqy7hyMXOGGWsRxnuZ8t8BeEJBIHy\r\nPguXIR+wYvo1eveC+NMxHhTtjoSIn/E4vW0W9j5OlFeTK7HTNCuidIE0Hk2k\r\nXnEEoNO7ztxPPxsHz9g56uMhyAhf3mqKfvUFo/FLLRBOpxLO0kk64yAMcAHm\r\nc6ZI5Fz10y48+hHEv/RFOwfub9asF5NWHltanqyiZ+kHeoaieYJFc6t7Mt3j\r\ng8qxMKTUKAEeCfHt1UJCjp/aIgJRU4JRXgYXzsBNBFwBWOEBB/9nclmx98vf\r\noSpPUccBczvuZxmqk+jY6Id+vBhBFoEhtdTSpaw/JNstf0dTXN8RCFjB0lHt\r\na51llTjSobqcFwAU54/HKDOW3qMVbvadaGILpuCMCxdMgLWlpZdYY7BApv1N\r\n9zpN+iQ2tIrvnUQ312xKOXF/W83NUJ1nTObQYNpsUZLLG2N3kz11HuBS3E9F\r\ngEOYYy1tLT53hs5btqvQ5Jp4Iw5cBoBoTAmv+dPMDKYBroBPwuFeNRIokwLT\r\nrVcxrXajxlXaGXmmGS3PZ00HXq2g7vKIqWliMLLIWFl+LlVb6O8bMeXOT1l0\r\nXSO9GlLOSMDEc7pY26vkmAjbWv7iUWHNABEBAAHCwGkEGAEIABMFAlwBWOEJ\r\nEDow9MwKmo8QAhsMAAoJEDow9MwKmo8QjTcH/1pYXyXW/rpBrDg7w/dXJCfT\r\n8+RVYlhW3kqMxbid7EB8zgGVTDr3us/ki99hc2HjsKbxUqrGBxeh3Mmui7OD\r\nCI8XFeYl7lSDbgU6mZ5J4iXzdR8LNqIib4Horlx/Y24dOuvikSUNpDtFAYfa\r\nbZwxyKa/ihZT1rS1GO3V7tdAB9BJagJqVRssF5g5GBUAX3sxQ2p62HoUxPlJ\r\nOOr4AaCc1na92xScBJL8dtBBRQ5pUZWOjb2UHp9L5QdPaBX8T9ZAieOiTlSt\r\nQxoUfCk7RU0/TnsM3KqFnDFoCzkGxKAmU4LmGtP48qV+v2Jzvl+qcmqYuKtw\r\nH6FWd+EZH07MfdEIiTI=\r\n=wXbX\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n",
        "isDecrypted": null,
        "users": [
          "Test <t@est.com>"
        ],
        "ids": [
          { "fingerprint": "E76853E128A0D376CAE47C143A30F4CC0A9A8F10", "longid": "3A30F4CC0A9A8F10", "shortid": "0A9A8F10", "keywords": "DEMAND MARBLE CREDIT BENEFIT POTTERY CAPITAL" },
          { "fingerprint": "9EF2F8F36A841C0D5FAB8B0F0BAB9C018B265D22", "longid": "0BAB9C018B265D22", "shortid": "8B265D22", "keywords": "ARM FRIEND ABOUT BIND GRAPE CATTLE" }
        ],
        "algo": {
          "algorithm": "rsa_encrypt_sign",
          "bits": 2048,
          "algorithmId": 1
        },
        "created": 1543592161
      }
    ]
  });
  expectNoData(data);
  t.pass();
});

ava.test('decryptKey', async t => {
  const { keys: [key] } = getKeypairs('rsa1');
  const { data, json } = await request('decryptKey', { armored: key.private, passphrases: [key.passphrase] }, Buffer.from([]));
  const { keys: [decryptedKey] } = await openpgp.key.readArmored(json.decryptedKey);
  expect(decryptedKey.isDecrypted()).to.be.true;
  expectNoData(data);
  t.pass();
});

ava.test('encryptKey', async t => {
  const passphrase = 'this is some pass phrase';
  const { decrypted: [decryptedKey] } = getKeypairs('rsa1');
  const { data, json } = await request('encryptKey', { armored: decryptedKey, passphrase }, Buffer.from([]));
  const { keys: [encryptedKey] } = await openpgp.key.readArmored(json.encryptedKey);
  expect(encryptedKey.isDecrypted()).to.be.false;
  expect(await encryptedKey.decrypt(passphrase)).to.be.true;
  expectNoData(data);
  t.pass();
});

ava.test('parseDecryptMsg compat direct-encrypted-text', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys }, await getCompatAsset('direct-encrypted-text'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  t.pass();
});

ava.test('parseDecryptMsg compat direct-encrypted-pgpmime', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys }, await getCompatAsset('direct-encrypted-pgpmime'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-plain', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-plain'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'plain', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'plain' });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-encrypted-inline-text', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-encrypted-inline-text'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-encrypted-inline-pgpmime', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-encrypted-inline-pgpmime'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  t.pass();
});

ava.test('zxcvbnStrengthBar', async t => {
  const { data, json } = await request('zxcvbnStrengthBar', { guesses: 88946283684265, purpose: 'passphrase' }, []);
  expectNoData(data);
  expect(json).to.deep.equal({
    word: {
      match: 'day',
      word: 'poor',
      bar: 20,
      color: 'darkred',
      pass: false
    },
    seconds: 1111829,
    time: '13 days',
  });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-encrypted-inline-text-2 Mime-TextEncoder', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-encrypted-inline-text-2'));
  expectData(blocks, 'msgBlocks', [{ rendered: true, frameColor: 'green', htmlContent }]);
  expect(decryptJson).to.deep.equal({ replyType: 'encrypted' });
  t.pass();
});

ava.test('parseDecryptMsg - decryptErr', async t => {
  const { keys } = getKeypairs('rsa2'); // intentional key mismatch
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys }, await getCompatAsset('direct-encrypted-text'), false);
  expectData(blocks, 'msgBlocks', [{
    "type": "decryptErr",
    "content": "-----BEGIN PGP MESSAGE-----\nVersion: FlowCrypt [BUILD_REPLACEABLE_VERSION] Gmail Encryption\nComment: Seamlessly send and receive encrypted email\n\nwcBMAwurnAGLJl0iAQf+I2exIah3XL/zfPozDmVFSLJk4tBFIlIyFfGYcw5W\n+ebOL3Gu/+/oCIIlXrdP0FxIVEYnSEaevmB9p0FfXGpcw4Wr8PBnSubCkn2s\n+V//k6W1Uu915GmiwCgDkLTCP7vEHvwUglNvgAatDtNdJ3xrf2gjOOFiYQnn\n4JSI1msMfL5tmdFCyXm1g4mUe9MdVXfphrXIyvGu1Sufhv+T5FgteDW0c6lM\ng7G6jgX4q5xiT8r2LTxKlxHVlQSqvGlnx/yRXwqBs3PAMiS4u5JlKJX4aKVy\nFyN+gq++tWZC1XCSFzXfAf0rXcoDZ7nEkxdkKQqXgA6LCsFD79FMCtuenvzU\nU9JEAdvmmpGlextZcfCUmGgclQXgowDnjaXy5Uc6Bzmi8AlY/4MFo0Q3bOU4\nkNhLCiXTGNJlFDd0HLz8Cy7YXzLWZ94IuGk=\n=Bvit\n-----END PGP MESSAGE-----\n",
    "decryptErr": {
      "success": false,
      "error": {
        "type": "key_mismatch",
        "message": "Session key decryption failed."
      },
      "longids": {
        "message": ["0BAB9C018B265D22"],
        "matching": ["7C307E6F2092962D"],
        "chosen": ["7C307E6F2092962D"],
        "needPassphrase": []
      },
      "isEncrypted": true
    },
    "complete": true
  }]);
  expect(decryptJson).to.deep.equal({ replyType: 'plain' });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-plain-html', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-plain-html'));
  expectData(blocks, 'msgBlocks', [{ frameColor: 'plain', htmlContent: '<p>paragraph 1</p><p>paragraph 2 with <b>bold</b></p><p>paragraph 3 with <em style="color:red">red i</em></p>', rendered: true }]);
  expect(decryptJson).to.deep.equal({ replyType: 'plain' });
  t.pass();
});

ava.test('parseDecryptMsg compat mime-email-plain-with-pubkey', async t => {
  const { keys } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('parseDecryptMsg', { keys, isEmail: true }, await getCompatAsset('mime-email-plain-with-pubkey'));
  expectData(blocks, 'msgBlocks', [
    { rendered: true, frameColor: 'plain', htmlContent },
    {
      "type": "publicKey",
      "content": "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 0.0.1-dev Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxsBNBFwBWOEBB/9uIqBYIPDQbBqHMvGXhgnm+b2i5rNLXrrGoalrp7wYQ654\r\nZln/+ffxzttRLRiwRQAOG0z78aMDXAHRfI9d3GaRKTkhTqVY+C02E8NxgB3+\r\nmbSsF0Ui+oh1//LT1ic6ZnISCA7Q2h2U/DSAPNxDZUMu9kjh9TjkKlR81fiA\r\nlxuD05ivRxCnmZnzqZtHoUvvCqsENgRjO9a5oWpMwtdItjdRFF7UFKYpfeA+\r\nct0uUNMRVdPK7MXBEr2FdWiKN1K21dQ1pWiAwj/5cTA8hu5Jue2RcF8FcPfs\r\nniRihQkNqtLDsfY5no1B3xeSnyO2SES1bAHw8ObXZn/C/6jxFztkn4NbABEB\r\nAAHNEFRlc3QgPHRAZXN0LmNvbT7CwH8EEAEIACkFAlwBWOEGCwkHCAMCCRA6\r\nMPTMCpqPEAQVCAoCAxYCAQIZAQIbAwIeAQAKCRA6MPTMCpqPENaTB/0faBFR\r\n2k3RM7P427HyZOsZtqEPxuynsLUqmsAAup6LtPhir4CAsb5DSvgYrzC8pbrf\r\njCaodoB7hMXc8RxTbSh+vQc5Su4QwY8sqy7hyMXOGGWsRxnuZ8t8BeEJBIHy\r\nPguXIR+wYvo1eveC+NMxHhTtjoSIn/E4vW0W9j5OlFeTK7HTNCuidIE0Hk2k\r\nXnEEoNO7ztxPPxsHz9g56uMhyAhf3mqKfvUFo/FLLRBOpxLO0kk64yAMcAHm\r\nc6ZI5Fz10y48+hHEv/RFOwfub9asF5NWHltanqyiZ+kHeoaieYJFc6t7Mt3j\r\ng8qxMKTUKAEeCfHt1UJCjp/aIgJRU4JRXgYXzsBNBFwBWOEBB/9nclmx98vf\r\noSpPUccBczvuZxmqk+jY6Id+vBhBFoEhtdTSpaw/JNstf0dTXN8RCFjB0lHt\r\na51llTjSobqcFwAU54/HKDOW3qMVbvadaGILpuCMCxdMgLWlpZdYY7BApv1N\r\n9zpN+iQ2tIrvnUQ312xKOXF/W83NUJ1nTObQYNpsUZLLG2N3kz11HuBS3E9F\r\ngEOYYy1tLT53hs5btqvQ5Jp4Iw5cBoBoTAmv+dPMDKYBroBPwuFeNRIokwLT\r\nrVcxrXajxlXaGXmmGS3PZ00HXq2g7vKIqWliMLLIWFl+LlVb6O8bMeXOT1l0\r\nXSO9GlLOSMDEc7pY26vkmAjbWv7iUWHNABEBAAHCwGkEGAEIABMFAlwBWOEJ\r\nEDow9MwKmo8QAhsMAAoJEDow9MwKmo8QjTcH/1pYXyXW/rpBrDg7w/dXJCfT\r\n8+RVYlhW3kqMxbid7EB8zgGVTDr3us/ki99hc2HjsKbxUqrGBxeh3Mmui7OD\r\nCI8XFeYl7lSDbgU6mZ5J4iXzdR8LNqIib4Horlx/Y24dOuvikSUNpDtFAYfa\r\nbZwxyKa/ihZT1rS1GO3V7tdAB9BJagJqVRssF5g5GBUAX3sxQ2p62HoUxPlJ\r\nOOr4AaCc1na92xScBJL8dtBBRQ5pUZWOjb2UHp9L5QdPaBX8T9ZAieOiTlSt\r\nQxoUfCk7RU0/TnsM3KqFnDFoCzkGxKAmU4LmGtP48qV+v2Jzvl+qcmqYuKtw\r\nH6FWd+EZH07MfdEIiTI=\r\n=wXbX\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n",
      "complete": true,
      "keyDetails": {
        "isDecrypted": null,
        "public": "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 0.0.1-dev Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxsBNBFwBWOEBB/9uIqBYIPDQbBqHMvGXhgnm+b2i5rNLXrrGoalrp7wYQ654\r\nZln/+ffxzttRLRiwRQAOG0z78aMDXAHRfI9d3GaRKTkhTqVY+C02E8NxgB3+\r\nmbSsF0Ui+oh1//LT1ic6ZnISCA7Q2h2U/DSAPNxDZUMu9kjh9TjkKlR81fiA\r\nlxuD05ivRxCnmZnzqZtHoUvvCqsENgRjO9a5oWpMwtdItjdRFF7UFKYpfeA+\r\nct0uUNMRVdPK7MXBEr2FdWiKN1K21dQ1pWiAwj/5cTA8hu5Jue2RcF8FcPfs\r\nniRihQkNqtLDsfY5no1B3xeSnyO2SES1bAHw8ObXZn/C/6jxFztkn4NbABEB\r\nAAHNEFRlc3QgPHRAZXN0LmNvbT7CwH8EEAEIACkFAlwBWOEGCwkHCAMCCRA6\r\nMPTMCpqPEAQVCAoCAxYCAQIZAQIbAwIeAQAKCRA6MPTMCpqPENaTB/0faBFR\r\n2k3RM7P427HyZOsZtqEPxuynsLUqmsAAup6LtPhir4CAsb5DSvgYrzC8pbrf\r\njCaodoB7hMXc8RxTbSh+vQc5Su4QwY8sqy7hyMXOGGWsRxnuZ8t8BeEJBIHy\r\nPguXIR+wYvo1eveC+NMxHhTtjoSIn/E4vW0W9j5OlFeTK7HTNCuidIE0Hk2k\r\nXnEEoNO7ztxPPxsHz9g56uMhyAhf3mqKfvUFo/FLLRBOpxLO0kk64yAMcAHm\r\nc6ZI5Fz10y48+hHEv/RFOwfub9asF5NWHltanqyiZ+kHeoaieYJFc6t7Mt3j\r\ng8qxMKTUKAEeCfHt1UJCjp/aIgJRU4JRXgYXzsBNBFwBWOEBB/9nclmx98vf\r\noSpPUccBczvuZxmqk+jY6Id+vBhBFoEhtdTSpaw/JNstf0dTXN8RCFjB0lHt\r\na51llTjSobqcFwAU54/HKDOW3qMVbvadaGILpuCMCxdMgLWlpZdYY7BApv1N\r\n9zpN+iQ2tIrvnUQ312xKOXF/W83NUJ1nTObQYNpsUZLLG2N3kz11HuBS3E9F\r\ngEOYYy1tLT53hs5btqvQ5Jp4Iw5cBoBoTAmv+dPMDKYBroBPwuFeNRIokwLT\r\nrVcxrXajxlXaGXmmGS3PZ00HXq2g7vKIqWliMLLIWFl+LlVb6O8bMeXOT1l0\r\nXSO9GlLOSMDEc7pY26vkmAjbWv7iUWHNABEBAAHCwGkEGAEIABMFAlwBWOEJ\r\nEDow9MwKmo8QAhsMAAoJEDow9MwKmo8QjTcH/1pYXyXW/rpBrDg7w/dXJCfT\r\n8+RVYlhW3kqMxbid7EB8zgGVTDr3us/ki99hc2HjsKbxUqrGBxeh3Mmui7OD\r\nCI8XFeYl7lSDbgU6mZ5J4iXzdR8LNqIib4Horlx/Y24dOuvikSUNpDtFAYfa\r\nbZwxyKa/ihZT1rS1GO3V7tdAB9BJagJqVRssF5g5GBUAX3sxQ2p62HoUxPlJ\r\nOOr4AaCc1na92xScBJL8dtBBRQ5pUZWOjb2UHp9L5QdPaBX8T9ZAieOiTlSt\r\nQxoUfCk7RU0/TnsM3KqFnDFoCzkGxKAmU4LmGtP48qV+v2Jzvl+qcmqYuKtw\r\nH6FWd+EZH07MfdEIiTI=\r\n=wXbX\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n",
        "users": ["Test <t@est.com>"],
        "ids": [
          { "fingerprint": "E76853E128A0D376CAE47C143A30F4CC0A9A8F10", "longid": "3A30F4CC0A9A8F10", "shortid": "0A9A8F10", "keywords": "DEMAND MARBLE CREDIT BENEFIT POTTERY CAPITAL" },
          { "fingerprint": "9EF2F8F36A841C0D5FAB8B0F0BAB9C018B265D22", "longid": "0BAB9C018B265D22", "shortid": "8B265D22", "keywords": "ARM FRIEND ABOUT BIND GRAPE CATTLE" }
        ],
        "algo": { "algorithm": "rsa_encrypt_sign", "bits": 2048, "algorithmId": 1 },
        "created": 1543592161
      }
    },
  ]);
  expect(decryptJson).to.deep.equal({ replyType: 'plain' });
  t.pass();
});


ava.test.after(async t => {
  nodeProcess.kill();
  t.pass();
});
