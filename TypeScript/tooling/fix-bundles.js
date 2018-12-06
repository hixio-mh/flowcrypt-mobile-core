

const fs = require('fs');

const bundleDir = 'build/bundles'
const assetsDir = 'source/assets';
const bundleRawDir = `${bundleDir}/raw`;
const bundleWipDir = `${bundleDir}/wip`;

try {
  fs.mkdirSync(bundleWipDir);
} catch (e) {
  if (String(e).indexOf('file already exists') === -1) {
    throw e;
  }
}

for (const filename of fs.readdirSync(bundleRawDir)) {
  if (filename !== 'flowcrypt.js') {
    const src = fs.readFileSync(`${bundleRawDir}/${filename}`).toString();
    const importableName = `dereq_${filename.replace(/\.js$/, '').replace(/-/g, '_')}`;
    let fixedExportSrc = src.replace(/^module\.exports =\n/, `const ${importableName} =\n`);
    fs.writeFileSync(`${bundleWipDir}/${filename}`, fixedExportSrc);
  }
}

fs.copyFileSync(`${bundleRawDir}/flowcrypt.js`, `${bundleDir}/flowcrypt-bundle.js`);

fs.writeFileSync(`${bundleDir}/openpgp-bundle.js`, [
  `${assetsDir}/openpgp-bundle-begin.txt`,
  `${bundleWipDir}/minimalistic-assert.js`,
  `${bundleWipDir}/bn.js`,
  `${bundleWipDir}/asn1.js`,
  `source/lib/openpgp.js`,
  `${assetsDir}/openpgp-bundle-end.txt`,
].map(path => fs.readFileSync(path).toString()).join('\n'));
