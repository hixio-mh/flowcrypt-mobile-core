/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

// todo: add APP_ENV prod to android

import * as ava from 'ava';
import { startNodeCoreInstance, request, expectNoData } from './test/test-utils';
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

ava.test.after(async t => {
  nodeProcess.kill();
  t.pass();
});
