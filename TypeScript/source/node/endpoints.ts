/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../types/openpgp.d.ts" />

'use strict';

import { PgpMsg } from '../core/pgp';
import { Validate } from './validate';
import { fmtRes, Buffers } from './fmt';

export class Debug {
  public static printChunk = (name: string, data: Buffer | Uint8Array) => {
    console.log(`Debug.printChunk[${name}]: js[${Uint8Array.from(data).subarray(0, 20).join(', ')}]`);
  }
}

export class Endpoints {

  [endpoint: string]: ((uncheckedReq: any, data: Buffers) => Promise<Buffers>) | undefined;

  public version = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    return fmtRes(process.versions);
  }

  public encryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptMsg(uncheckedReq);
    const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, Buffer.concat(data), undefined, true) as OpenPGP.EncryptArmorResult;
    return fmtRes({}, Buffer.from(encrypted.data));
  }

  public encryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptFile(uncheckedReq);
    const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, Buffer.concat(data), req.name, false) as OpenPGP.EncryptBinaryResult;
    return fmtRes({}, encrypted.message.packets.write());
  }

  /**
   * Todo - this will fail when it receives a Mime message, because emailjs mime libraries are not loaded, see platform/require.ts
   */
  public decryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd } = Validate.decryptMsg(uncheckedReq);
    const decrypted = await PgpMsg.decrypt({ keys, passphrases }, Buffer.concat(data), msgPwd, false);
    if (!decrypted.success) {
      decrypted.message = undefined;
      return fmtRes(decrypted);
    }
    const blocks = await PgpMsg.fmtDecrypted(decrypted.content.text!);
    const blockMetas = blocks.map(b => ({ type: b.type, length: b.content.length }));
    // first line is a blockMetas JSON. Data below represent one JSON-stringified block per line. This is so that it can be read as a stream
    return fmtRes({ success: true, blockMetas }, Buffer.from(blocks.map(b => JSON.stringify(b)).join('\n')));
  }

  public decryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd } = Validate.decryptFile(uncheckedReq);
    // Debug.printChunk("decryptFile.data", data);
    const decryptedMeta = await PgpMsg.decrypt({ keys, passphrases }, Buffer.concat(data), msgPwd, true);
    if (!decryptedMeta.success) {
      decryptedMeta.message = undefined;
      return fmtRes(decryptedMeta);
    }
    const decryptedData = Buffer.from(decryptedMeta.content.uint8!);
    decryptedMeta.content.uint8 = undefined;
    // Debug.printChunk("decryptFile.decryptedData", decryptedData);
    return fmtRes({ success: true, name: decryptedMeta.content.filename || '' }, decryptedData);
  }

}

