

const fs = require('fs');

const libsDir = 'source/lib';
const bundleDir = 'build/bundles'
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
  if (!filename.startsWith('entrypoint-')) {
    const src = fs.readFileSync(`${bundleRawDir}/${filename}`).toString();
    const importableName = `dereq_${filename.replace(/\.js$/, '').replace(/^(node|bare)-/, '').replace(/-/g, '_')}`;
    let fixedExportSrc = src.replace(/^module\.exports =\n/, `const ${importableName} =\n`);
    fs.writeFileSync(`${bundleWipDir}/${filename}`, fixedExportSrc);
  }
}

// copy raw to flowcrypt-bundle
fs.copyFileSync(`${bundleRawDir}/entrypoint-node.js`, `${bundleDir}/entrypoint-node-bundle.js`);
fs.copyFileSync(`${bundleRawDir}/entrypoint-bare.js`, `${bundleDir}/entrypoint-bare-bundle.js`);

// copy wip to html-sanitize-bundle
fs.copyFileSync(`${bundleWipDir}/node-html-sanitize.js`, `${bundleDir}/node-html-sanitize-bundle.js`);
fs.writeFileSync(
  `${bundleDir}/bare-html-sanitize-bundle.js`, 
  `${fs.readFileSync('./node_modules/sanitize-html/dist/sanitize-html.js').toString()}\nconst dereq_html_sanitize = window.sanitizeHtml;\n`
);

// // concat emailjs bundle/wip to become emailjs-bundle 
// fs.writeFileSync(`${bundleDir}/emailjs-bundle.js`, [ // this would work when using modules directly from Node - we don't do that yet
//   `${bundleWipDir}/emailjs-mime-parser.js`,
//   `${bundleWipDir}/emailjs-mime-builder.js`,
// ].map(path => fs.readFileSync(path).toString()).join('\n'));

// concat emailjs libs/* to become emailjs-bundle 
const emailjsRawDep = [
  `${libsDir}/iso-8859-2.js`,
  `${libsDir}/emailjs/punycode.js`,
  `${libsDir}/emailjs/emailjs-stringencoding.js`,
  `${libsDir}/emailjs/emailjs-mime-types.js`,
  `${libsDir}/emailjs/emailjs-mime-codec.js`,
  `${libsDir}/emailjs/emailjs-addressparser.js`,
  `${libsDir}/emailjs/emailjs-mime-parser.js`,
  `${libsDir}/emailjs/emailjs-mime-builder.js`,
].map(path => fs.readFileSync(path).toString()).join('\n');
const emailjsNodeDep = emailjsRawDep // these replacements fix imports and exports of modules for use in nodejs-mobile
  .replace(/require\(['"]buffer['"]\)\.Buffer/g, 'Buffer')
  .replace(/require\(['"](punycode|emailjs-[a-z\-]+)['"]\)/g, found => found.replace('require(', 'global[').replace(')', ']'))
  .replace(/typeof define === 'function' && define\.amd/g, 'false')
  .replace(/typeof exports ===? 'object'/g, 'false');
fs.writeFileSync(`${bundleDir}/bare-emailjs-bundle.js`, `\n(function(){\n// begin emailjs\n${emailjsRawDep}\n// end emailjs\n})();\n`);
fs.writeFileSync(`${bundleDir}/node-emailjs-bundle.js`, `\n(function(){\n// begin emailjs\n${emailjsNodeDep}\n// end emailjs\n})();\n`);

// concat libs to become openpgp-bundle
const rawOpenpgpLib = fs.readFileSync('source/lib/openpgp.js').toString();

fs.writeFileSync(`${bundleDir}/node-openpgp-bundle.js`, `
  (function(){
    console.debug = console.log;
    ${[
      `${bundleWipDir}/minimalistic-assert.js`,
      `${bundleWipDir}/bn.js`,
      `${bundleWipDir}/node-asn1.js`
    ].map(path => fs.readFileSync(path).toString()).join('\n')}
    ${rawOpenpgpLib}
    const openpgp = module.exports;
    module.exports = {};
    global['openpgp'] = openpgp;
  })();
`);

const rsaDecryptionReplaceable = /[a-z0-9A-Z_]+\.default\.rsa\.decrypt\(c, n, e, d, p, q, u\)/
if(!rsaDecryptionReplaceable.test(rawOpenpgpLib)) {
  throw new Error(`Could not find ${rsaDecryptionReplaceable} in openpgp.js`)
}
const hostRsaDecryption = function(c_encrypted, n, e, d, p, q, pgp_style_u_which_is_different_than_der_style_u) {
  var RSAPrivateKey = dereq_asn1.define('RSAPrivateKey', function() {
    this.seq().obj(
      this.key('version').int(),
      this.key('modulus').int(),
      this.key('publicExponent').int(),
      this.key('privateExponent').int(),
      this.key('prime1').int(),
      this.key('prime2').int(),
      this.key('exponent1').int(),
      this.key('exponent2').int(),
      this.key('coefficient').int(),
    );
  });
  const dp = d.mod(p.subn(1)); // d mod (p-1)
  const dq = d.mod(q.subn(1)); // d mod (q-1)
  const u = q.invm(p); // (inverse of q) mod p (as per DER spec. PGP spec has it in the opposite way)
  var derRsaPrv = RSAPrivateKey.encode({
    version: 0,
    modulus: n,
    publicExponent: e,
    privateExponent: d,
    prime1: p,
    prime2: q,
    exponent1: dp, //         INTEGER,  -- d mod (p-1)
    exponent2: dq, //        INTEGER,  -- d mod (q-1)
    coefficient: u, //       INTEGER,  -- (inverse of q) mod p
  }, 'der');
  let derRsaPrvBase64 = derRsaPrv.toString("base64");
  let encryptedBase64 = btoa(_util2.default.Uint8Array_to_str(c_encrypted.toUint8Array()));
  // console.log(`RSA: ${derRsaPrvBase64}`);
  // console.log(`SessionKey: ${encryptedBase64}`);
  let decryptedBase64 = coreHost.decryptRsaNoPadding(derRsaPrvBase64, encryptedBase64);
  // console.log(`decrypted: ${decryptedBase64}`);
  if(!decryptedBase64) { // possibly msg-key mismatch
    throw new Error("Session key decryption failed (host)");
  }
  const bnDecrypted = new _bn2.default(_util2.default.b64_to_Uint8Array(decryptedBase64));
  return bnDecrypted.toArrayLike(Uint8Array, 'be', n.byteLength());
}
let hostAugumentedOpenpgpLib = rawOpenpgpLib.replace(
  rsaDecryptionReplaceable, 
  `${hostRsaDecryption.toString()}(data_params[0], n, e, d, p, q, u)`
);

const rsaVerifyReplaceable = /const EM = await _public_key2\.default\.rsa\.verify\(m, n, e\);/
if(!rsaVerifyReplaceable.test(hostAugumentedOpenpgpLib)) {
  throw new Error(`Could not find ${rsaVerifyReplaceable} in openpgp.js`)
}
hostAugumentedOpenpgpLib = hostAugumentedOpenpgpLib.replace(
  rsaVerifyReplaceable, `
  const computed = coreHost.verifyRsaModPow(m.toString(10), e.toString(10), n.toString(10)); // returns empty str if not supported: js fallback below
  const EM = computed ? new _bn2.default(computed, 10).toArrayLike(Uint8Array, 'be', n.byteLength()) : await _public_key2.default.rsa.verify(m, n, e);`
);

const aesDecryptionReplaceable = /return _cfb\.AES_CFB\.decrypt\(ct, key, iv\);/
if(!aesDecryptionReplaceable.test(hostAugumentedOpenpgpLib)) {
  throw new Error(`Could not find ${aesDecryptionReplaceable} in openpgp.js`)
}
hostAugumentedOpenpgpLib = hostAugumentedOpenpgpLib.replace(
  aesDecryptionReplaceable, 
  `return Uint8Array.from(coreHost.decryptAesCfbNoPadding(ct, key, iv));`
);

const iteratedStringToKeyReplaceable = /const data = _util2\.default\.concatUint8Array\(\[s2k\.salt, passphrase\]\);/
if(!iteratedStringToKeyReplaceable.test(hostAugumentedOpenpgpLib)) {
  throw new Error(`Could not find ${iteratedStringToKeyReplaceable} in openpgp.js`)
}
hostAugumentedOpenpgpLib = hostAugumentedOpenpgpLib.replace(
  iteratedStringToKeyReplaceable, 
  `return Uint8Array.from(coreHost.produceHashedIteratedS2k(s2k.algorithm, prefix, s2k.salt, passphrase, count));`
);

fs.writeFileSync(`${bundleDir}/bare-openpgp-bundle.js`, `
${fs.readFileSync('source/lib/web-streams-polyfill.js').toString()}
const ReadableStream = self.ReadableStream;
const WritableStream = self.WritableStream;
const TransformStream = self.TransformStream;
/* asn1 begin */
${fs.readFileSync(`${bundleWipDir}/bare-asn1.js`).toString()}
/* asn1 end */
${hostAugumentedOpenpgpLib}
const openpgp = window.openpgp;
`);
