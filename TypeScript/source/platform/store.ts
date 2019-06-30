/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Contact } from '../core/pgp.js';
import { requireOpenpgp } from './require.js';

const openpgp = requireOpenpgp();

let DECRYPTED_KEY_CACHE: { [longid: string]: OpenPGP.key.Key } = {};
let DECRYPTED_KEY_CACHE_WIPE_TIMEOUT: NodeJS.Timeout;

const keyLongid = (k: OpenPGP.key.Key) => openpgp.util.str_to_hex(k.getKeyId().bytes).toUpperCase();

export class Store {

  static dbContactGet = async (db: void, emailOrLongid: string[]): Promise<(Contact | undefined)[]> => {
    return [];
  }

  static decryptedKeyCacheSet = (k: OpenPGP.key.Key) => {
    Store.decryptedKeyCacheRenewExpiry();
    DECRYPTED_KEY_CACHE[keyLongid(k)] = k;
  }

  static decryptedKeyCacheGet = (longid: string): OpenPGP.key.Key | undefined => {
    Store.decryptedKeyCacheRenewExpiry();
    return DECRYPTED_KEY_CACHE[longid];
  }

  static decryptedKeyCacheWipe = () => {
    DECRYPTED_KEY_CACHE = {};
  }

  private static decryptedKeyCacheRenewExpiry = () => {
    if (DECRYPTED_KEY_CACHE_WIPE_TIMEOUT) {
      clearTimeout(DECRYPTED_KEY_CACHE_WIPE_TIMEOUT);
    }
    DECRYPTED_KEY_CACHE_WIPE_TIMEOUT = setTimeout(Store.decryptedKeyCacheWipe, 5 * 60 * 1000);
  }

}
