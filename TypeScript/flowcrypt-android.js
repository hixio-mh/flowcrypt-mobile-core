(function () {
  'use strict';

  /* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */
  Object.defineProperty(exports, "__esModule", { value: true });
  const pgp_js_1 = require("./core/pgp.js");
  const http = require("http");
  var versions_server = http.createServer((request, response) => {
    console.log(pgp_js_1.Pgp.name);
    // response.end(`node.js:v1: ${JSON.stringify(process.versions)}`);
    response.end(`node.js:hello-hash: ${pgp_js_1.Pgp.hash.sha256('hello')}`);
  });
  versions_server.listen(3000, 'localhost');

}());
