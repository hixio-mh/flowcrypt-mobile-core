

const fs = require('fs');

const libsDir = 'source/lib';
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

// fix up all bundles/raw to become bundles/wip
for (const filename of fs.readdirSync(bundleRawDir)) {
  if (filename !== 'flowcrypt.js') {
    const src = fs.readFileSync(`${bundleRawDir}/${filename}`).toString();
    const importableName = `dereq_${filename.replace(/\.js$/, '').replace(/-/g, '_')}`;
    let fixedExportSrc = src.replace(/^module\.exports =\n/, `const ${importableName} =\n`);
    fs.writeFileSync(`${bundleWipDir}/${filename}`, fixedExportSrc);
  }
}

// copy raw to flowcrypt-bundle
fs.copyFileSync(`${bundleRawDir}/flowcrypt.js`, `${bundleDir}/flowcrypt-bundle.js`);

// // concat emailjs bundle/wip to become emailjs-bundle 
// fs.writeFileSync(`${bundleDir}/emailjs-bundle.js`, [ // this would work when using modules directly from Node - we don't do that yet
//   `${bundleWipDir}/emailjs-mime-parser.js`,
//   `${bundleWipDir}/emailjs-mime-builder.js`,
// ].map(path => fs.readFileSync(path).toString()).join('\n'));

// concat emailjs libs/* to become emailjs-bundle 
const emailjsRaw = [
  `${libsDir}/iso-8859-2.js`,
  `${libsDir}/emailjs/punycode.js`,
  `${libsDir}/emailjs/emailjs-stringencoding.js`,
  `${libsDir}/emailjs/emailjs-mime-types.js`,
  `${libsDir}/emailjs/emailjs-mime-codec.js`,
  `${libsDir}/emailjs/emailjs-addressparser.js`,
  `${libsDir}/emailjs/emailjs-mime-parser.js`,
  `${libsDir}/emailjs/emailjs-mime-builder.js`,
].map(path => fs.readFileSync(path).toString()).join('\n');
const emailjsFixed = emailjsRaw
  .replace(/require\(['"]buffer['"]\)\.Buffer/g, 'Buffer')
  .replace(/require\(['"](punycode|emailjs-[a-z\-]+)['"]\)/g, found => found.replace('require(', 'global[').replace(')', ']'))
  .replace(/typeof define === 'function' && define\.amd/g, 'false')
  .replace(/typeof exports === 'object'/g, 'false');
fs.writeFileSync(
  `${bundleDir}/emailjs-bundle.js`,
  `\n(function(){\n// begin emailjs\n${emailjsFixed}\n// end emailjs\n})();\n`
);

// concat libs to become openpgp-bundle
fs.writeFileSync(`${bundleDir}/openpgp-bundle.js`, [
  `${assetsDir}/openpgp-bundle-begin.txt`,
  `${bundleWipDir}/minimalistic-assert.js`,
  `${bundleWipDir}/bn.js`,
  `${bundleWipDir}/asn1.js`,
  `source/lib/openpgp.js`,
  `${assetsDir}/openpgp-bundle-end.txt`,
].map(path => fs.readFileSync(path).toString()).join('\n'));
