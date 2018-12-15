
const fs = require('fs');

const wipPath = 'build/final/flowcrypt-android-wip.js';
const finalPath = 'build/final/flowcrypt-android-prod.js';
const finalPathDev = 'build/final/flowcrypt-android-dev.js';

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
  console.error(e);
}
`;

fs.writeFileSync(finalPathDev, fs.readFileSync('source/assets/flowcrypt-android-dev-begin.txt').toString() + finalSrc);
fs.writeFileSync(finalPath, finalSrc);
fs.unlinkSync(wipPath);
