/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../../../flowcrypt-node-modules/node_modules/@types/node/index.d.ts" />
/// <reference path="./core/types/openpgp.d.ts" />

'use strict';

import * as https from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import { parseReq } from './node/parse';
import { fmtErr, indexHtml, HttpClientErr, HttpAuthErr, Buffers, printReplayTestDefinition } from './node/fmt';
import { Endpoints } from './node/endpoints';
import { sendNativeMessageToJava } from './node/native';
import { setGlobals } from './platform/util';

setGlobals();

declare const NODE_SSL_KEY: string, NODE_SSL_CRT: string, NODE_SSL_CA: string, NODE_AUTH_HEADER: string, NODE_PORT: string, NODE_DEBUG: string, NODE_PRINT_REPLAY: string;
declare const APP_ENV: 'dev' | 'prod', APP_PROFILE: string;

const doPrintDebug = Boolean(NODE_DEBUG === 'true');
const doProfile = Boolean(APP_PROFILE === 'true');
const doPrintReplay = Boolean(NODE_PRINT_REPLAY === 'true');

const endpoints = new Endpoints();

const delegateReqToEndpoint = async (endpointName: string, uncheckedReq: any, data: Buffers): Promise<Buffers> => {
  const endpointHandler = endpoints[endpointName];
  if (endpointHandler) {
    return endpointHandler(uncheckedReq, data);
  }
  throw new HttpClientErr(`unknown endpoint: ${endpointName}`);
}

const handleReq = async (req: IncomingMessage, res: ServerResponse, receivedAt: number): Promise<Buffers> => {
  if (doProfile) {
    console.debug(`PROFILE[${Date.now() - receivedAt}ms] new request ${req.url}`);
  }
  if (!NODE_AUTH_HEADER || !NODE_SSL_KEY || !NODE_SSL_CRT || !NODE_SSL_CA) {
    throw new Error('Missing NODE_AUTH_HEADER, NODE_SSL_CA, NODE_SSL_KEY or NODE_SSL_CRT');
  }
  if (req.headers['authorization'] !== NODE_AUTH_HEADER) {
    throw new HttpAuthErr('Wrong Authorization');
  }
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/html');
    return [indexHtml];
  }
  if (req.url === '/' && req.method === 'POST') {
    const { endpoint, request, data } = await parseReq(req, doPrintDebug);
    if (doProfile) {
      console.debug(`PROFILE[${Date.now() - receivedAt}ms] finished receiving and parsing request+data`);
    }
    if (doPrintDebug) {
      console.debug(`parsed endpoint:`, endpoint);
      console.debug(`parsed request:`, request);
    }
    if (doPrintReplay) {
      printReplayTestDefinition(endpoint, request, Buffer.concat(data))
    }
    const endpointResponse = await delegateReqToEndpoint(endpoint, request, data);
    if (doProfile) {
      console.debug(`PROFILE[${Date.now() - receivedAt}ms] finished processing request`);
    }
    return endpointResponse;
  }
  throw new HttpClientErr(`unknown path ${req.url}`);
}

const serverOptins: https.ServerOptions = {
  key: NODE_SSL_KEY,
  cert: NODE_SSL_CRT,
  ca: NODE_SSL_CA,
  requestCert: true,
  rejectUnauthorized: true,
};

const LISTEN_PORT = Number(NODE_PORT);
if (isNaN(LISTEN_PORT) || LISTEN_PORT < 1024) {
  throw new Error('Wrong or no NODE_PORT supplied');
}

const sendRes = (res: ServerResponse, buffers: Buffers) => {
  res.end(Buffer.concat(buffers));
}

const server = https.createServer(serverOptins, (request, res) => { // all responses are status code 200, error status is parsed from body
  const receivedAt = Date.now();
  handleReq(request, res, receivedAt).then(buffers => {
    if (doProfile) {
      console.debug(`PROFILE[${Date.now() - receivedAt}ms] begin sending response`);
    }
    sendRes(res, buffers)
    if (doProfile) {
      console.debug(`PROFILE[${Date.now() - receivedAt}ms] response sent, DONE`);
    }
  }).catch(e => {
    res.statusCode = 200;
    if (e instanceof HttpAuthErr) {
      res.setHeader('WWW-Authenticate', 'Basic realm="flowcrypt-android-node"');
    } else if (!(e instanceof HttpClientErr)) {
      console.error(e);
    }
    res.end(fmtErr(e));
  });
});

server.listen(LISTEN_PORT, 'localhost');

server.on('listening', () => {
  const address = server.address();
  const msg = `listening on ${typeof address === 'object' ? address.port : address} APP_ENV:${APP_ENV}`;
  console.info(msg);
  sendNativeMessageToJava(msg);
});
