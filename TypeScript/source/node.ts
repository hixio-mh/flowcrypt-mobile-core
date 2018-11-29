/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="./types/openpgp.d.ts" />
/// <reference path="./types/jquery.d.ts" />
/// <reference path="./types/android.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/chrome/index.d.ts" />

'use strict';

import { Pgp } from './core/pgp.js';
import * as http from 'http';

var versions_server = http.createServer((request, response) => {
  console.log(Pgp.name);
  response.end(`node.js:v1: ${JSON.stringify(process.versions)}`);
  // response.end(`node.js:hello-hash: ${Pgp.hash.sha256('hello')}`);
});

versions_server.listen(3000, 'localhost');
