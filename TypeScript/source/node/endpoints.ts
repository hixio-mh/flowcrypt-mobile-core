/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../types/openpgp.d.ts" />

'use strict';

import { PgpMsg, Pgp, KeyDetails } from '../core/pgp';
import { Validate } from './validate';
import { fmtRes, Buffers } from './fmt';
import { gmailBackupSearchQuery } from '../core/const';
import { requireOpenpgp } from '../platform/require';
import { Str } from '../core/common';
import { Mime, MsgBlock } from '../core/mime';
import { Buf } from '../core/buf';

const openpgp = requireOpenpgp();

export class Endpoints {

  [endpoint: string]: ((uncheckedReq: any, data: Buffers) => Promise<Buffers>) | undefined;

  public version = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    return fmtRes(process.versions);
  }

  public encryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptMsg(uncheckedReq);
    const encrypted = await PgpMsg.encrypt({ pubkeys: req.pubKeys, data: Buffer.concat(data), armor: true }) as OpenPGP.EncryptArmorResult;
    return fmtRes({}, Buffer.from(encrypted.data));
  }

  public encryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptFile(uncheckedReq);
    const encrypted = await PgpMsg.encrypt({ pubkeys: req.pubKeys, data: Buffer.concat(data), filename: req.name, armor: false }) as OpenPGP.EncryptBinaryResult;
    return fmtRes({}, encrypted.message.packets.write());
  }

  public decryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd, isEmail } = Validate.decryptMsg(uncheckedReq);
    const kisWithPp = { keys, passphrases };
    const rawBlocks: MsgBlock[] = [];
    if (isEmail) {
      const { blocks } = await Mime.process(Buffer.concat(data));
      rawBlocks.push(...blocks);
    } else {
      rawBlocks.push(Pgp.internal.msgBlockObj('encryptedMsg', new Buf(Buffer.concat(data))));
    }
    const blocks: MsgBlock[] = []; // contains decrypted or otherwise formatted data
    for (const rawBlock of rawBlocks) {
      if (rawBlock.type === 'encryptedMsg') {
        const decrypted = await PgpMsg.decrypt({ kisWithPp, msgPwd, encryptedData: rawBlock.content instanceof Uint8Array ? rawBlock.content : Buffer.from(rawBlock.content) });
        if (!decrypted.success) {
          decrypted.message = undefined;
          return fmtRes(decrypted); // not ideal. If decryption of one block fails, no other blocks will make it to the client
        }
        blocks.push(... await PgpMsg.fmtDecrypted(decrypted.content));
      } else {
        blocks.push(rawBlock);
      }
    }
    const blockMetas = blocks.map(b => ({ type: b.type, length: b.content.length }));
    // first line is a blockMetas JSON. Data below represent one JSON-stringified block per line. This is so that it can be read as a stream later
    return fmtRes({ success: true, blockMetas }, Buffer.from(blocks.map(b => JSON.stringify(b)).join('\n')));
  }

  public decryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd } = Validate.decryptFile(uncheckedReq);
    const decryptedMeta = await PgpMsg.decrypt({ kisWithPp: { keys, passphrases }, encryptedData: Buffer.concat(data), msgPwd });
    if (!decryptedMeta.success) {
      decryptedMeta.message = undefined;
      return fmtRes(decryptedMeta);
    }
    return fmtRes({ success: true, name: decryptedMeta.filename || '' }, decryptedMeta.content);
  }

  public parseDateStr = async (uncheckedReq: any, data: Buffers) => {
    const { dateStr } = Validate.parseDateStr(uncheckedReq);
    return fmtRes({ timestamp: String(Date.parse(dateStr) || -1) });
  }

  public gmailBackupSearch = async (uncheckedReq: any, data: Buffers) => {
    const { acctEmail } = Validate.gmailBackupSearch(uncheckedReq);
    return fmtRes({ query: gmailBackupSearchQuery(acctEmail) });
  }

  public parseKeys = async (uncheckedReq: any, data: Buffers) => {
    const keyDetails: KeyDetails[] = [];
    const allData = Buffer.concat(data);
    const pgpType = await PgpMsg.type({ data: allData });
    if (!pgpType) {
      return fmtRes({ format: 'unknown', keyDetails, error: { message: `Cannot parse key: could not determine pgpType` } });
    }
    if (pgpType.armored) {
      // armored
      const { blocks } = Pgp.armor.detectBlocks(allData.toString());
      for (const block of blocks) {
        const { keys } = await Pgp.key.parse(block.content.toString());
        keyDetails.push(...keys);
      }
      return fmtRes({ format: 'armored', keyDetails });
    }
    // binary
    const { keys: openPgpKeys } = await openpgp.key.read(allData);
    for (const openPgpKey of openPgpKeys) {
      keyDetails.push(await Pgp.key.serialize(openPgpKey))
    }
    return fmtRes({ format: 'binary', keyDetails });
  }

  public isEmailValid = async (uncheckedReq: any, data: Buffers) => {
    const { email } = Validate.isEmailValid(uncheckedReq);
    return fmtRes({ valid: Str.isEmailValid(email) });
  }

  public decryptKey = async (uncheckedReq: any, data: Buffers) => {
    const { armored, passphrases } = Validate.decryptKey(uncheckedReq);
    const key = await readArmoredKeyOrThrow(armored);
    if (await Pgp.key.decrypt(key, passphrases)) {
      return fmtRes({ decryptedKey: key.armor() });
    }
    return fmtRes({ decryptedKey: null });
  }

  public encryptKey = async (uncheckedReq: any, data: Buffers) => {
    const { armored, passphrase } = Validate.encryptKey(uncheckedReq);
    const key = await readArmoredKeyOrThrow(armored);
    if (!passphrase || passphrase.length < 10) { // last resort check, this should never happen
      throw new Error('Pass phrase length seems way too low! Pass phrase strength should be properly checked before encrypting a key.');
    }
    await key.encrypt(passphrase);
    return fmtRes({ encryptedKey: key.armor() });
  }

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

  public static printChunk = (name: string, data: Buffer | Uint8Array) => {
    const header1 = `Debug.printChunk[${name}, ${data.length}B]: `;
    const header2 = ' '.repeat(header1.length);
    const chunk = Array.from(data.subarray(0, 30));
    const chunkIndices = chunk.map((v, i) => i);
    console.log(`-\n${header1}-+-[${chunk.map(Debug.pad).join(' ')} ]\n${header2} |-[${chunk.map(Debug.char).map(Debug.pad).join(' ')} ]\n${header2} \`-[${chunkIndices.map(Debug.pad).join(' ')} ]`);
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