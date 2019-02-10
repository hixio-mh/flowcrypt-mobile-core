/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import * as ava from 'ava';
import { Subprocess } from './flowcrypt-node-modules';
import { readFileSync } from 'fs';
import * as https from 'https';
import { expect } from 'chai';
import { util } from '../../../../flowcrypt-node-modules/source';

type AvaContext = ava.ExecutionContext<{}>;
type JsonDict = { [k: string]: any };

const stderrs: string[] = [];
const stdouts: string[] = [];

export const startNodeCoreInstance = async (t: AvaContext) => {
  const r = await Subprocess.spawn('node', ['build/final/flowcrypt-android-dev.js'], `listening on 3000`);
  await util.wait(500); // wait for initial rn-bridge msg to pass
  const stdLog = (type: 'stderr' | 'stdout', content: Buffer) => {
    const msg = `node ${type}: ${content.toString().trim()}`;
    if (type === 'stderr') {
      stderrs.push(msg);
      console.error(msg);
    } else {
      stdouts.push(msg);
      console.log(msg);
    }
  };
  Subprocess.onStderr = ({ stderr }) => stdLog('stderr', stderr);
  Subprocess.onStdout = ({ stdout }) => stdLog('stdout', stdout);
  return r;
};

const getSslInfo = new Function(`${readFileSync('source/assets/flowcrypt-android-dev-begin.txt').toString()}\nreturn {NODE_SSL_CA,NODE_SSL_CRT,NODE_SSL_KEY,NODE_AUTH_HEADER};`);
const { NODE_SSL_CA, NODE_SSL_CRT, NODE_SSL_KEY, NODE_AUTH_HEADER } = getSslInfo();
const requestOpts = { hostname: 'localhost', port: 3000, method: 'POST', ca: NODE_SSL_CA, cert: NODE_SSL_CRT, key: NODE_SSL_KEY, headers: { Authorization: NODE_AUTH_HEADER } };

export const request = (endpoint: string, json: JsonDict, data: Buffer | string | never[], expectSuccess = true): Promise<{ json: JsonDict, data: Buffer, err?: string, status: number }> => new Promise((resolve, reject) => {
  const req = https.request(requestOpts, r => {
    const buffers: Buffer[] = [];
    r.on('data', buffer => buffers.push(buffer));
    r.on('end', () => {
      const everything = Buffer.concat(buffers);
      const newlineIndex = everything.indexOf('\n');
      if (newlineIndex === -1) {
        console.log('everything', everything);
        console.log('everything', everything.toString());
        reject(`could not find newline in response data`);
      } else {
        const jsonLine = everything.slice(0, newlineIndex).toString();
        const json = JSON.parse(jsonLine);
        const data = everything.slice(newlineIndex + 1);
        const err = json.error ? json.error.message : undefined;
        const status = r.statusCode || -1;
        if (expectSuccess && (status !== 200 || typeof err !== 'undefined')) {
          reject(`Status unexpectedly ${status} with err: ${err}`);
        } else {
          resolve({ json, data, err, status });
        }
      }
    });
  });
  req.on('error', reject);
  req.write(endpoint)
  req.write('\n');
  req.write(JSON.stringify(json));
  req.write('\n');
  req.write(data instanceof Buffer ? data : Buffer.from(data as string));
  req.end();
});

export const expectNoData = (data: Buffer) => {
  expect(data).to.be.instanceof(Buffer);
  expect(data).to.have.property('length').that.equals(0);
}

export const expectSomeData = (data: Buffer) => {
  expect(data).to.be.instanceof(Buffer);
  expect(data).to.have.property('length').that.does.not.equal(0);
}