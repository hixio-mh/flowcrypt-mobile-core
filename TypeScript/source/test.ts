/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

// todo: add APP_ENV prod to android

import * as ava from 'ava';
import { startNodeCoreInstance, request, expectNoData, getKeypairs, expectData, expectEmptyJson } from './test/test-utils';
import { expect } from 'chai';
import { ChildProcess } from './test/flowcrypt-node-modules';

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

ava.test('encryptMsg - decryptMsg', async t => {
  const { pubKeys, keys, passphrases } = getKeypairs('rsa1');
  const { data: encryptedMsg, json: encryptJson } = await request('encryptMsg', { pubKeys }, 'hello\nwrld');
  expectEmptyJson(encryptJson);
  expectData(encryptedMsg, 'armoredMsg');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases }, encryptedMsg);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: 13 }] });
  expectData(blocks, 'msgBlocks', [{ type: "html", content: 'hello<br>wrld', complete: true }]);
  t.pass();
});

ava.test('encryptFile - decryptFile', async t => {
  const { pubKeys, keys, passphrases } = getKeypairs('rsa1');
  const name = 'myfile.txt';
  const content = Buffer.from([10, 20, 40, 80, 160, 0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  const { data: encryptedFile, json: encryptJson } = await request('encryptFile', { pubKeys, name }, content);
  expectEmptyJson(encryptJson);
  expectData(encryptedFile);
  const { data: decryptedContent, json: decryptJson } = await request('decryptFile', { keys, passphrases }, encryptedFile);
  expect(decryptJson).to.deep.equal({ success: true, name });
  expectData(decryptedContent, 'binary', content);
  t.pass();
});

ava.test.after(async t => {
  nodeProcess.kill();
  t.pass();
});
