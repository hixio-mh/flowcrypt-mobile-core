/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Str } from '../core/common.js';
import { mnemonic } from '../core/mnemonic.js';
import { Pgp } from '../core/pgp.js';

export type DbContactFilter = { has_pgp?: boolean, substring?: string, limit?: number };

export type Contact = {
  email: string; name: string | null; pubkey: string | null; has_pgp: 0 | 1; searchable: string[];
  client: string | null; attested: boolean | null; fingerprint: string | null; longid: string | null; keywords: string | null;
  pending_lookup: number; last_use: number | null;
  date: number | null; /* todo - should be removed. email provider search seems to return this? */
};
export interface PrvKeyInfo {
  private: string;
  longid: string;
  decrypted?: OpenPGP.key.Key;
}
export interface KeyInfo extends PrvKeyInfo {
  public: string;
  fingerprint: string;
  primary: boolean;
  keywords: string;
}
export type KeyInfosWithPassphrases = { keys: PrvKeyInfo[]; passphrases: string[]; };
export class Store {


  static async passphraseGet(acctEmail: string, longid: string, ignoreSession: boolean = false): Promise<string | undefined> {
    return 'test-passphrase';
  }

  static async keysGet(acctEmail: string, longids?: string[]): Promise<KeyInfo[]> {
    return [];
  }

  // static saveError(err: any, errMsg?: string) {
  // }

  static dbContactObj(email: string, name?: string, client?: string, pubkey?: string, attested?: boolean, pendingLookup?: boolean | number, lastUse?: number): Contact {
    const fingerprint = pubkey ? Pgp.key.fingerprint(pubkey) : undefined;
    email = Str.parseEmail(email).email;
    if (!Str.isEmailValid(email)) {
      throw new Error(`Cannot save contact because email is not valid: ${email}`);
    }
    return {
      email,
      name: name || null, // tslint:disable-line:no-null-keyword
      pubkey: pubkey || null, // tslint:disable-line:no-null-keyword
      has_pgp: pubkey ? 1 : 0, // number because we use it for sorting
      searchable: [],
      client: pubkey ? (client || null) : null, // tslint:disable-line:no-null-keyword
      attested: pubkey ? Boolean(attested) : null, // tslint:disable-line:no-null-keyword
      fingerprint: fingerprint || null, // tslint:disable-line:no-null-keyword
      longid: fingerprint ? (Pgp.key.longid(fingerprint) || null) : null, // tslint:disable-line:no-null-keyword
      keywords: fingerprint ? mnemonic(Pgp.key.longid(fingerprint)!) || null : null, // tslint:disable-line:no-null-keyword
      pending_lookup: pubkey ? 0 : (pendingLookup ? 1 : 0),
      last_use: lastUse || null, // tslint:disable-line:no-null-keyword
      date: null, // tslint:disable-line:no-null-keyword
    };
  }

  static dbContactSave = async (db: void, contact: Contact | Contact[]): Promise<void> => {
    return;
  }

  static dbContactUpdate = async (db: void, email: string | string[], update: void): Promise<void> => {
    return;
  }

  static dbContactGet = async (db: void, emailOrLongid: string[]): Promise<(Contact | undefined)[]> => {
    return [];
  }

  static dbContactSearch = async (db: void, query: DbContactFilter): Promise<Contact[]> => {
    return [];
  }

}
