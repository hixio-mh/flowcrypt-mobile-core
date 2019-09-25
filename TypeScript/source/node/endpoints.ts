/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../core/types/openpgp.d.ts" />

'use strict';

import { PgpMsg, Pgp, KeyDetails, DecryptErrTypes, openpgp } from '../core/pgp';
import { Validate } from './validate';
import { fmtRes, Buffers, isContentBlock, fmtContentBlock } from './fmt';
import { gmailBackupSearchQuery } from '../core/const';
import { Str } from '../core/common';
import { Mime, MsgBlock, RichHeaders } from '../core/mime';
import { Buf } from '../core/buf';
import { Store } from '../platform/store';
import { Xss } from '../platform/xss';
import { VERSION } from '../core/const';
import { Att } from '../core/att';

export class Endpoints {

  [endpoint: string]: ((uncheckedReq: any, data: Buffers) => Promise<Buffers>) | undefined;

  public version = async (): Promise<Buffers> => {
    const hasNodeVersions = typeof process === 'object' && process && typeof process.versions === 'object' && process.versions && process.versions.openssl;
    return fmtRes(hasNodeVersions ? process.versions : { app_version: VERSION });
  }

  public encryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptMsg(uncheckedReq);
    const encrypted = await PgpMsg.encrypt({ pubkeys: req.pubKeys, data: Buf.concat(data), armor: true }) as OpenPGP.EncryptArmorResult;
    return fmtRes({}, Buf.fromUtfStr(encrypted.data));
  }

  public generateKey = async (uncheckedReq: any): Promise<Buffers> => {
    Store.keyCacheWipe(); // decryptKey may be used when changing major settings, wipe cache to prevent dated results
    const { passphrase, userIds, variant } = Validate.generateKey(uncheckedReq);
    if (passphrase.length < 12) {
      throw new Error('Pass phrase length seems way too low! Pass phrase strength should be properly checked before encrypting a key.');
    }
    let k = await Pgp.key.create(userIds, variant, passphrase);
    return fmtRes({ key: legacyIsDecrypted(await Pgp.key.details(await Pgp.key.read(k.private))) });
  }

  public composeEmail = async (uncheckedReq: any): Promise<Buffers> => {
    const req = Validate.composeEmail(uncheckedReq);
    const mimeHeaders: RichHeaders = { to: req.to, from: req.from, subject: req.subject, cc: req.cc, bcc: req.bcc };
    if (req.replyToMimeMsg) {
      const previousMsg = await Mime.decode(Buf.fromUtfStr((req.replyToMimeMsg.substr(0, 10000).split('\n\n')[0] || '') + `\n\nno content`));
      const replyHeaders = Mime.replyHeaders(previousMsg);
      mimeHeaders['in-reply-to'] = replyHeaders['in-reply-to'];
      mimeHeaders['references'] = replyHeaders['references'];
    }
    if (req.format === 'plain') {
      const atts = (req.atts || []).map(({name, type, base64}) => new Att({name, type, data: Buf.fromBase64Str(base64)}));
      return fmtRes({}, Buf.fromUtfStr(await Mime.encode(req.text, mimeHeaders, atts)));
    } else if (req.format === 'encrypt-inline') {
      const encryptedAtts: Att[] = [];
      for(const att of req.atts || []) {
        const encryptedAtt = await PgpMsg.encrypt({pubkeys: req.pubKeys, data: Buf.fromBase64Str(att.base64), filename: att.name, armor: false}) as OpenPGP.EncryptBinaryResult;
        encryptedAtts.push(new Att({ name: att.name, type: 'application/pgp-encrypted', data: encryptedAtt.message.packets.write() }))
      }
      const encrypted = await PgpMsg.encrypt({ pubkeys: req.pubKeys, data: Buf.fromUtfStr(req.text), armor: true }) as OpenPGP.EncryptArmorResult;
      return fmtRes({}, Buf.fromUtfStr(await Mime.encode(encrypted.data, mimeHeaders, encryptedAtts)));
    } else {
      throw new Error(`Unknown format: ${req.format}`);
    }
  }

  public encryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptFile(uncheckedReq);
    const encrypted = await PgpMsg.encrypt({ pubkeys: req.pubKeys, data: Buf.concat(data), filename: req.name, armor: false }) as OpenPGP.EncryptBinaryResult;
    return fmtRes({}, encrypted.message.packets.write());
  }

  public parseDecryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys: kisWithPp, msgPwd, isEmail } = Validate.parseDecryptMsg(uncheckedReq);
    const rawBlocks: MsgBlock[] = []; // contains parsed, unprocessed / possibly encrypted data
    let rawSigned: string | undefined = undefined;
    if (isEmail) {
      const { blocks, rawSignedContent } = await Mime.process(Buf.concat(data));
      rawSigned = rawSignedContent;
      rawBlocks.push(...blocks);
    } else {
      rawBlocks.push(Pgp.internal.msgBlockObj('encryptedMsg', new Buf(Buf.concat(data))));
    }
    const sequentialProcessedBlocks: MsgBlock[] = []; // contains decrypted or otherwise formatted data
    for (const rawBlock of rawBlocks) {
      if ((rawBlock.type === 'signedMsg' || rawBlock.type === 'signedHtml') && rawBlock.signature) {
        const verify = await PgpMsg.verifyDetached({ sigText: Buf.fromUtfStr(rawBlock.signature), plaintext: Buf.with(rawSigned || rawBlock.content) });
        if (rawBlock.type === 'signedHtml') {
          sequentialProcessedBlocks.push({ type: 'verifiedMsg', content: Xss.htmlSanitizeKeepBasicTags(rawBlock.content.toString()), verifyRes: verify, complete: true });
        } else { // text
          sequentialProcessedBlocks.push({ type: 'verifiedMsg', content: Str.asEscapedHtml(rawBlock.content.toString()), verifyRes: verify, complete: true });
        }
      } else if (rawBlock.type === 'encryptedMsg' || rawBlock.type === 'signedMsg') {
        const decryptRes = await PgpMsg.decrypt({ kisWithPp, msgPwd, encryptedData: Buf.with(rawBlock.content) });
        if (decryptRes.success) {
          if (decryptRes.isEncrypted) {
            sequentialProcessedBlocks.push(... await PgpMsg.fmtDecryptedAsSanitizedHtmlBlocks(decryptRes.content));
          } else {
            // treating as text, converting to html - what about plain signed html? This could produce html tags
            // although hopefully, that would, typically, result in the `(rawBlock.type === 'signedMsg' || rawBlock.type === 'signedHtml')` block above
            // the only time I can imagine it screwing up down here is if it was a signed-only message that was actually fully armored (text not visible) with a mime msg inside
            // ... -> in which case the user would I think see full mime content?
            sequentialProcessedBlocks.push({ type: 'verifiedMsg', content: Str.asEscapedHtml(decryptRes.content.toUtfStr()), complete: true, verifyRes: decryptRes.signature });
          }
        } else {
          decryptRes.message = undefined;
          sequentialProcessedBlocks.push(Pgp.internal.msgBlockDecryptErrObj(decryptRes.error.type === DecryptErrTypes.noMdc ? decryptRes.content! : rawBlock.content, decryptRes));
        }
      } else if (rawBlock.type === 'encryptedAtt' && rawBlock.attMeta && /^(0x)?[A-Fa-f0-9]{16,40}\.asc\.pgp$/.test(rawBlock.attMeta.name || '')) {
        // encrypted pubkey attached
        const decryptRes = await PgpMsg.decrypt({ kisWithPp, msgPwd, encryptedData: Buf.with(rawBlock.attMeta.data || '') });
        if (decryptRes.content) {
          sequentialProcessedBlocks.push({ type: 'publicKey', content: decryptRes.content.toString(), complete: true });
        } else {
          sequentialProcessedBlocks.push(rawBlock); // will show as encryptedAtt
        }
      } else {
        sequentialProcessedBlocks.push(rawBlock);
      }
    }
    const msgContentBlocks: MsgBlock[] = [];
    const blocks: MsgBlock[] = [];
    let replyType = 'plain';
    for (const block of sequentialProcessedBlocks) { // fix/adjust/format blocks before returning it over JSON
      if (block.content instanceof Buf) { // cannot JSON-serialize Buf
        block.content = isContentBlock(block.type) ? block.content.toUtfStr() : block.content.toRawBytesStr();
      } else if (block.attMeta && block.attMeta.data instanceof Uint8Array) {
        // converting to base64-encoded string instead of uint8 for JSON serilization
        // value actually replaced to a string, but type remains Uint8Array type set to satisfy TS
        // no longer used below, only gets passed to be serialized so be safe
        block.attMeta.data = Buf.fromUint8(block.attMeta.data).toBase64Str() as any as Uint8Array;
      }
      if (block.type === 'decryptedHtml' || block.type === 'decryptedText' || block.type === 'decryptedAtt') {
        replyType = 'encrypted';
      }
      if (block.type === 'publicKey') {
        if (!block.keyDetails) { // this could eventually be moved into detectBlocks, which would make it async
          const { keys } = await Pgp.key.normalize(block.content);
          if (keys.length) {
            for (const pub of keys) {
              blocks.push({ type: 'publicKey', content: pub.armor(), complete: true, keyDetails: legacyIsDecrypted(await Pgp.key.details(pub)) });
            }
          } else {
            blocks.push({
              type: 'decryptErr', content: block.content, complete: true, decryptErr: {
                success: false,
                error: { type: 'format' as DecryptErrTypes, message: 'Badly formatted public key' },
                longids: { message: [], matching: [], chosen: [], needPassphrase: [] }
              }
            });
          }
        } else {
          block.keyDetails = legacyIsDecrypted(block.keyDetails);
          blocks.push(block);
        }
      } else if (isContentBlock(block.type)) {
        msgContentBlocks.push(block);
      } else if (Mime.isPlainInlineImg(block)) {
        msgContentBlocks.push(block);
      } else if (block.type !== 'plainAtt') {
        blocks.push(block);
      }
    }
    const { contentBlock, text } = fmtContentBlock(msgContentBlocks);
    blocks.unshift(contentBlock);
    // data represent one JSON-stringified block per line. This is so that it can be read as a stream later
    return fmtRes({ text, replyType }, Buf.fromUtfStr(blocks.map(b => JSON.stringify(b)).join('\n')));
  }

  public decryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys: kisWithPp, msgPwd } = Validate.decryptFile(uncheckedReq);
    const decryptedMeta = await PgpMsg.decrypt({ kisWithPp, encryptedData: Buf.concat(data), msgPwd });
    if (!decryptedMeta.success) {
      decryptedMeta.message = undefined;
      return fmtRes(decryptedMeta);
    }
    return fmtRes({ success: true, name: decryptedMeta.filename || '' }, decryptedMeta.content);
  }

  public parseDateStr = async (uncheckedReq: any) => {
    const { dateStr } = Validate.parseDateStr(uncheckedReq);
    return fmtRes({ timestamp: String(Date.parse(dateStr) || -1) });
  }

  public zxcvbnStrengthBar = async (uncheckedReq: any) => {
    const r = Validate.zxcvbnStrengthBar(uncheckedReq);
    if (r.purpose === 'passphrase') {
      if(typeof r.guesses === 'number') { // the host has a port of zxcvbn and already knows amount of guesses per password
        return fmtRes(Pgp.password.estimateStrength(r.guesses));
      } else if(typeof r.value === 'string') { // gues does not have zxcvbn, let's use zxcvbn-js to estimate guesses
        type FakeWindow = {zxcvbn: (password: string, weakWords: string[]) => {guesses: number}};
        if(typeof (window as unknown as FakeWindow).zxcvbn !== 'function') {
          throw new Error("window.zxcvbn missing in js")
        }
        let guesses = (window as unknown as FakeWindow).zxcvbn(r.value, Pgp.password.weakWords()).guesses;
        return fmtRes(Pgp.password.estimateStrength(guesses));
      } else {
        throw new Error('Unexpected format: guesses is not a number, value is not a string');  
      }
    } else {
      throw new Error(`Unknown purpose: ${r.purpose}`);
    }
  }

  public gmailBackupSearch = async (uncheckedReq: any) => {
    const { acctEmail } = Validate.gmailBackupSearch(uncheckedReq);
    return fmtRes({ query: gmailBackupSearchQuery(acctEmail) });
  }

  public parseKeys = async (_uncheckedReq: any, data: Buffers) => {
    const keyDetails: KeyDetails[] = [];
    const allData = Buf.concat(data);
    const pgpType = await PgpMsg.type({ data: allData });
    if (!pgpType) {
      return fmtRes({ format: 'unknown', keyDetails });
    }
    if (pgpType.armored) {
      // armored
      const { blocks } = Pgp.armor.detectBlocks(allData.toString());
      for (const block of blocks) {
        const { keys } = await Pgp.key.parse(block.content.toString());
        keyDetails.push(...keys);
      }
      return fmtRes({ format: 'armored', keyDetails: keyDetails.map(legacyIsDecrypted) });
    }
    // binary
    const { keys: openPgpKeys } = await openpgp.key.read(allData);
    for (const openPgpKey of openPgpKeys) {
      keyDetails.push(await Pgp.key.details(openPgpKey))
    }
    return fmtRes({ format: 'binary', keyDetails: keyDetails.map(legacyIsDecrypted) });
  }

  public isEmailValid = async (uncheckedReq: any) => {
    const { email } = Validate.isEmailValid(uncheckedReq);
    return fmtRes({ valid: Str.isEmailValid(email) });
  }

  public decryptKey = async (uncheckedReq: any) => {
    Store.keyCacheWipe(); // decryptKey may be used when changing major settings, wipe cache to prevent dated results
    const { armored, passphrases } = Validate.decryptKey(uncheckedReq);
    if (passphrases.length !== 1) { // todo - refactor endpoint decryptKey api to accept a single pp
      throw new Error(`decryptKey: Can only accept exactly 1 pass phrase for decrypt, received: ${passphrases.length}`);
    }
    const key = await readArmoredKeyOrThrow(armored);
    if (await Pgp.key.decrypt(key, passphrases[0])) {
      return fmtRes({ decryptedKey: key.armor() });
    }
    return fmtRes({ decryptedKey: null });
  }

  public encryptKey = async (uncheckedReq: any) => {
    Store.keyCacheWipe(); // encryptKey may be used when changing major settings, wipe cache to prevent dated results
    const { armored, passphrase } = Validate.encryptKey(uncheckedReq);
    const key = await readArmoredKeyOrThrow(armored);
    if (!passphrase || passphrase.length < 12) { // last resort check, this should never happen
      throw new Error('Pass phrase length seems way too low! Pass phrase strength should be properly checked before encrypting a key.');
    }
    await key.encrypt(passphrase);
    return fmtRes({ encryptedKey: key.armor() });
  }

}

/**
 * Core now uses isFullyEncrypted / isFullyDecrypted
 * However host apps still rely on legacy isDecrypted field
 * This should be deleted when https://github.com/FlowCrypt/flowcrypt-android/issues/708 is resolved
 */
const legacyIsDecrypted = (keyDetails: KeyDetails) => {
  if (keyDetails.private) {
    if (keyDetails.isFullyDecrypted) {
      // @ts-ignore
      keyDetails.isDecrypted = true;
    } else if (keyDetails.isFullyEncrypted) {
      // @ts-ignore
      keyDetails.isDecrypted = false;
    } else {
      throw new Error('This key is only partially encrypted.')
    }
  } else {
    // @ts-ignore
    keyDetails.isDecrypted = null; // public key
  }
  return keyDetails
}

const readArmoredKeyOrThrow = async (armored: string) => {
  const { keys: [key], err } = await openpgp.key.readArmored(armored);
  if (err && err.length && err[0] instanceof Error) {
    throw err[0];
  }
  if (!key) {
    throw new Error('No key found');
  }
  return key;
}

export class Debug {

  public static printChunk = (name: string, data: Buf | Uint8Array) => {
    const header1 = `Debug.printChunk[${name}, ${data.length}B]: `;
    const header2 = ' '.repeat(header1.length);
    const chunk = Array.from(data.subarray(0, 30));
    const chunkIndices = chunk.map((_, i) => i);
    console.log(`-\n${header1} - +-[${chunk.map(Debug.pad).join(' ')}]\n${header2} | -[${chunk.map(Debug.char).map(Debug.pad).join(' ')}]\n${header2} \`-[${chunkIndices.map(Debug.pad).join(' ')} ]`);
  }

  private static char = (byte: number) => {
    let c = ''
    if (byte === 10) {
      c += '\\n';
    } else if (byte === 13) {
      c += '\\r';
    } else if (byte === 140 || byte === 160) {
      c += '???';
    } else {
      c += String.fromCharCode(byte);
    }
    return c;
  }

  private static pad = (char: string | number) => {
    char = String(char);
    while (char.length < 3) {
      char = ' ' + char;
    }
    return char;
  }
}