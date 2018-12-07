/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../types/openpgp.d.ts" />

'use strict';

import { Pgp } from '../core/pgp';
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
      const encrypted = await Pgp.msg.encrypt(req.pubKeys, undefined, undefined, data!, undefined, true) as OpenPGP.EncryptArmorResult;
      return fmtRes({}, encrypted.data);
    } else {
      const encrypted = await Pgp.msg.encrypt(req.pubKeys, undefined, undefined, data!, req.filename, false) as OpenPGP.EncryptBinaryResult;
      return fmtRes({}, encrypted.message.packets.write());
    }
  }

  public decrypt = async (uncheckedReq: any, data: string | undefined): Promise<string> => {
    return fmtRes({ not: "implemented" }, 'not implemented');
  }

}
