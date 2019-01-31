
const fs = require('fs');

const wipPath = 'build/final/flowcrypt-android-wip.js';
const finalPath = 'build/final/flowcrypt-android-prod.js';
const finalPathDev = 'build/final/flowcrypt-android-dev.js';

const wipSrc = fs.readFileSync(wipPath).toString();

const fixedImportsSrc = wipSrc
  .replace(/require\(['"]bn\.js['"]\)/g, 'dereq_bn')
  .replace(/require\(['"]minimalistic-assert['"]\)/g, 'dereq_minimalistic_assert')
  .replace(/require\(['"]inherits['"]\)/g, 'require("util").inherits')
  .replace(/require\(['"]asn1\.js['"]\)/g, 'dereq_asn1');

const finalSrc = `
try {
/* final flowcrypt-android bundle starts here */
${fixedImportsSrc.replace("'[BUILD_REPLACEABLE_VERSION]'", 'APP_VERSION')}
/* final flowcrypt-android bundle ends here */
} catch(e) {
  console.error(e);
}
`;

fs.writeFileSync(finalPathDev, fs.readFileSync('source/assets/flowcrypt-android-dev-begin.txt').toString() + finalSrc);
fs.writeFileSync(finalPath, finalSrc);
fs.unlinkSync(wipPath);
