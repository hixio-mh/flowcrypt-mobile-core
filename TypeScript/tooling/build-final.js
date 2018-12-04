
const fs = require('fs');

const wipPath = 'build/final/flowcrypt-android-wip.js';
const finalPath = 'build/final/flowcrypt-android.js';

const wipSrc = fs.readFileSync(wipPath).toString();

const fixedImportsSrc = wipSrc
  .replace(/require\(['"]bn\.js['"]\)/g, 'dereq_bn')
  .replace(/require\(['"]minimalistic-assert['"]\)/g, 'dereq_minimalistic_assert')
  .replace(/require\(['"]inherits['"]\)/g, 'require("util").inherits')
  .replace(/_dereq_\(['"]bn\.js['"]\)/g, 'dereq_bn')
  .replace(/_dereq_\(['"]asn1\.js['"]\)/g, 'dereq_asn1')
  .replace(/_dereq_\(['"]inherits['"]\)/g, 'require("util").inherits');

const finalSrc = `
try {

/* final flowcrypt-android bundle starts here */
${fixedImportsSrc}
/* final flowcrypt-android bundle ends here */

} catch(e) {
  var http = require('http');
  var versions_server = http.createServer((request, response) => {
    response.end(JSON.stringify({error: {
      message: "startup error: " + String(e),
      stack:  e && typeof e === 'object' ? e.stack || '' : ''
    }}));
  });
  versions_server.listen(3000, 'localhost');
}
`;

fs.writeFileSync(finalPath, finalSrc);
fs.unlinkSync(wipPath);
