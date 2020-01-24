# flowcrypt-mobile-core

This repo hosts TS Core with added interfaces to run it on iOS or Android.


## Build, test, assets

```bash
npm install
npm test
```

When built (with `npm test` or `npm run-script build`), you'll see the final product in `./build/final`:
 - `flowcrypt-android-dev.js`: for running tests, pre-configured with dev secrets (for desktop Nodejs)
 - `flowcrypt-android-prod.js`: for use on Android, run with [nodejs-mobile](https://github.com/janeasystems/nodejs-mobile) which is a full-fledged Nodejs background process. The Android app will generate self-signed HTTPS certs for use by Nodejs. Nodejs will expose a port for the app to listen to, secured by these HTTPS certs for encryption as well as two-way authentication.
 - `flowcrypt-ios-prod.js`: for use on iOS, run with [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore) which is a bare JS engine. The iOS app is calling JS methods directly, without the need for HTTP stack unlike Android.

## TS Core

Code in [source/core](https://github.com/FlowCrypt/flowcrypt-mobile-core/tree/master/source/core) is reused across iOS, Android, browser extension and backend code. Commonly, this code is developed along with [browser extension](https://github.com/FlowCrypt/flowcrypt-browser/tree/master/extension/js/common/core) and then merged into this repo after important changes land there.

## Methods/endpoints

The TS Core API meant to be used on Android/iOS has the following methods (see [entrypoint.ts](https://github.com/FlowCrypt/flowcrypt-mobile-core/blob/master/source/node/endpoints.ts)):
 - `generateKey`: generate a `curve25519|rsa2048|rsa4096` key
 - `composeEmail`: compose a MIME message as `encrypt-inline|encrypt-pgpmime|plain`
 - `parseDecryptMsg`: parse a MIME message into `MsgBlock[]` (representing text, html, attachments, encrypted parts, ...), decrypt encrypted blocks with available keys
 - `encryptFile`, `decryptFile`: encrypt/decrypt OpenPGP data without armoring/dearmoring
 - `zxcvbnStrengthBar`: turn estimated pass phrase guess count into actionable representation of strength, and how long would it take to bruteforce it using 20k cores. Uses [zxcvbn](https://github.com/dropbox/zxcvbn) to estimate bruteforce guesses.
 - `parseKeys`: parse armored or binary keys to get their details/parameters
 - `decryptKey`, `encryptKey`: accepts armored key, returns armored key either encrypted or decrypted with provided pass phrase
 
## Method call input/output format

**todo**
