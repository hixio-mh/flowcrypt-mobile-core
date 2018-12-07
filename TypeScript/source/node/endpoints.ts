/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../types/openpgp.d.ts" />

'use strict';

import { PgpMsg } from '../core/pgp';
import { Validate } from './validate';
import { fmtRes } from './responses';

export class Endpoints {

  [endpoint: string]: ((uncheckedReq: any, data: string | undefined) => Promise<string>) | undefined;

  public version = async (uncheckedReq: any, data: string | undefined): Promise<string> => {
    return fmtRes(process.versions);
  }

  public encrypt = async (uncheckedReq: any, data: string | undefined): Promise<string> => {
    const req = Validate.encrypt(uncheckedReq, data);
    if (typeof req.filename === 'undefined') {
      const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, data!, undefined, true) as OpenPGP.EncryptArmorResult;
      return fmtRes({}, encrypted.data);
    } else {
      const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, data!, req.filename, false) as OpenPGP.EncryptBinaryResult;
      return fmtRes({}, encrypted.message.packets.write());
    }
  }

  public decryptMsg = async (uncheckedReq: any, data: string | undefined): Promise<string> => {
    const { keys, passphrases, msgPwd } = Validate.decryptMsg(uncheckedReq, data);
    const decrypted = await PgpMsg.decrypt({ keys, passphrases }, data!, msgPwd, false);
    if (!decrypted.success) {
      decrypted.message = undefined;
      return fmtRes(decrypted);
    }
    return fmtRes({ blocks: await PgpMsg.fmtDecrypted(decrypted.content.text!) });
  }

  public decryptFile = async (uncheckedReq: any, data: string | undefined): Promise<string> => {
    const { keys, passphrases, msgPwd } = Validate.decryptFile(uncheckedReq, data);
    const decrypted = await PgpMsg.decrypt({ keys, passphrases }, data!, msgPwd, true);
    if (!decrypted.success) {
      decrypted.message = undefined;
      return fmtRes(decrypted);
    }
    const decryptedData = decrypted.content.uint8;
    decrypted.content.uint8 = undefined;
    return fmtRes(decrypted, decryptedData);
  }

}


