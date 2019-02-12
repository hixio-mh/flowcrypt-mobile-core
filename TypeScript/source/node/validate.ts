/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

type Obj = { [k: string]: any };

export namespace NodeRequest {

  type PrvKeyInfo = { private: string; longid: string };
  export type encryptMsg = { pubKeys: string[] };
  export type encryptFile = { pubKeys: string[], name: string };
  export type decryptMsg = { keys: PrvKeyInfo[], passphrases: string[], msgPwd?: string, isEmail?: boolean };
  export type decryptFile = { keys: PrvKeyInfo[], passphrases: string[], msgPwd?: string };
  export type parseDateStr = { dateStr: string };
  export type gmailBackupSearch = { acctEmail: string };
  export type isEmailValid = { email: string };
  export type decryptKey = { armored: string, passphrases: string[] };
  export type encryptKey = { armored: string, passphrase: string };

}

export class Validate {

  public static encryptMsg = (v: any): NodeRequest.encryptMsg => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]')) {
      return v as NodeRequest.encryptMsg;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptMsg');
  }

  public static decryptMsg = (v: any): NodeRequest.decryptMsg => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'passphrases', 'string[]') && hasProp(v, 'msgPwd', 'string?') && hasProp(v, 'isEmail', 'boolean?')) {
      return v as NodeRequest.decryptMsg;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptMsg');
  }

  public static encryptFile = (v: any): NodeRequest.encryptFile => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]') && hasProp(v, 'name', 'string')) {
      return v as NodeRequest.encryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptFile');
  }

  public static decryptFile = (v: any): NodeRequest.decryptFile => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'passphrases', 'string[]') && hasProp(v, 'msgPwd', 'string?')) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

  public static parseDateStr = (v: any): NodeRequest.parseDateStr => {
    if (isObj(v) && hasProp(v, 'dateStr', 'string')) {
      return v as NodeRequest.parseDateStr;
    }
    throw new Error('Wrong request structure for NodeRequest.dateStrParse');
  }

  public static gmailBackupSearch = (v: any): NodeRequest.gmailBackupSearch => {
    if (isObj(v) && hasProp(v, 'acctEmail', 'string')) {
      return v as NodeRequest.gmailBackupSearch;
    }
    throw new Error('Wrong request structure for NodeRequest.gmailBackupSearchQuery');
  }

  public static isEmailValid = (v: any): NodeRequest.isEmailValid => {
    if (isObj(v) && hasProp(v, 'email', 'string')) {
      return v as NodeRequest.isEmailValid;
    }
    throw new Error('Wrong request structure for NodeRequest.isEmailValid');
  }

  public static decryptKey = (v: any): NodeRequest.decryptKey => {
    if (isObj(v) && hasProp(v, 'armored', 'string') && hasProp(v, 'passphrases', 'string[]')) {
      return v as NodeRequest.decryptKey;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptKey');
  }

  public static encryptKey = (v: any): NodeRequest.encryptKey => {
    if (isObj(v) && hasProp(v, 'armored', 'string') && hasProp(v, 'passphrase', 'string')) {
      return v as NodeRequest.encryptKey;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptKey');
  }

}

const isObj = (v: any): v is Obj => {
  return v && typeof v === 'object';
}

const hasProp = (v: Obj, name: string, type: 'string[]' | 'object' | 'string' | 'number' | 'string?' | 'boolean?' | 'PrvKeyInfo[]'): boolean => {
  if (!isObj(v)) {
    return false;
  }
  const value = v[name];
  if (type === 'number' || type === 'string') {
    return typeof value === type;
  }
  if (type === 'boolean?') {
    return typeof value === 'boolean' || typeof value === 'undefined';
  }
  if (type === 'string?') {
    return typeof value === 'string' || typeof value === 'undefined';
  }
  if (type === 'string[]') {
    return Array.isArray(value) && value.filter((x: any) => typeof x === 'string').length === value.length;
  }
  if (type === 'PrvKeyInfo[]') {
    return Array.isArray(value) && value.filter((ki: any) => hasProp(ki, 'private', 'string') && hasProp(ki, 'longid', 'string')).length === value.length;
  }
  if (type === 'object') {
    return isObj(value);
  }
  return false;
}
