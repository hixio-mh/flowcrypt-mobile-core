/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="./types/openpgp.d.ts" />
/// <reference path="./types/jquery.d.ts" />
/// <reference path="../node_modules/@types/chrome/index.d.ts" />

'use strict';

import * as https from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import { parseReq } from './node/parse';
import { fmtRes, fmtErr, indexHtml, HttpClientErr, HttpAuthErr } from './node/responses';
import { testEndpointHandler } from './node/tests';
import { Endpoints } from './node/endpoints';

declare const NODE_SSL_KEY: string, NODE_SSL_CRT: string, NODE_AUTH_HEADER: string;

(global as any).atob = (b64str: string) => Buffer.from(b64str, 'base64').toString('binary');
(global as any).btoa = (binary: string) => Buffer.from(binary, 'binary').toString('base64');

const endpoints = new Endpoints();

const delegateReqToEndpoint = async (endpointName: string, uncheckedReq: any, optionalData?: string): Promise<string> => {
  if (endpointName.indexOf('test') === 0) {
    return fmtRes(await testEndpointHandler(endpointName));
  }
  const endpointHandler = endpoints[endpointName];
  if (endpointHandler) {
    return endpointHandler(uncheckedReq, optionalData);
  }
  throw new HttpClientErr(`unknown endpoint: ${endpointName}`);
}

const handleReq = async (req: IncomingMessage, res: ServerResponse): Promise<string> => {
  if (!NODE_AUTH_HEADER || !NODE_SSL_KEY || !NODE_SSL_CRT) {
    throw new Error('Missing NODE_AUTH_HEADER, NODE_SSL_KEY or NODE_SSL_CRT');
  }
  if (req.headers['authorization'] !== NODE_AUTH_HEADER) {
    throw new HttpAuthErr('Wrong Authorization');
  }
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/html');
    return indexHtml;
  }
  if (req.url === '/' && req.method === 'POST') {
    const { endpoint, request, data } = await parseReq(req);
    return await delegateReqToEndpoint(endpoint, request, data);
  }
  throw new HttpClientErr(`unknown path ${req.url}`);
}

https.createServer({ key: NODE_SSL_KEY, cert: NODE_SSL_CRT }, (request, response) => {
  handleReq(request, response).then((r) => {
    response.end(r);
  }).catch((e) => {
    if (e instanceof HttpAuthErr) {
      response.statusCode = 401;
      response.setHeader('WWW-Authenticate', 'Basic realm="flowcrypt-android-node"');
    } else if (e instanceof HttpClientErr) {
      response.statusCode = 400;
    } else {
      console.error(e);
      response.statusCode = 500;
    }
    response.end(fmtErr(e));
  });
}).listen(3000, 'localhost');
