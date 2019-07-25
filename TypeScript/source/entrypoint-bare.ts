/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="./core/types/openpgp.d.ts" />

'use strict';

import { fmtErr } from './node/fmt';
import { Endpoints } from './node/endpoints';
import { Buf } from './core/buf';

declare const global: any;

const endpoints = new Endpoints();

const fmt = (res: Buf) => res.toBase64Str();

global.handleRequestFromHost = (endpointName: string, request: string, data: string, cb: (b64response: string) => void): void => {
    try {
        const handler = endpoints[endpointName];
        if (!handler) {
            cb(fmt(fmtErr(new Error(`Unknown endpoint: ${endpointName}`))));
        } else {
            handler(JSON.parse(request), [Buf.fromBase64Str(data)])
                .then(res => cb(fmt(Buf.concat(res))))
                .catch(err => cb(fmt(fmtErr(err))));
        }
    } catch(err) {
        cb(fmt(fmtErr(err)));
    }
};
