/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

type Obj = { [k: string]: any };

export namespace NodeRequest {

  export type encryptMsg = { pubKeys: string[] };
  export type encryptFile = { pubKeys: string[], name: string };
  export type decryptMsg = { keys: { private: string; longid: string }[], passphrases: string[], msgPwd?: string };
  export type decryptFile = { keys: { private: string; longid: string }[], passphrases: string[], msgPwd?: string };

}

export class Validate {

  public static encryptMsg = (v: any, data: any): NodeRequest.encryptMsg => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]') && hasData(data)) {
      return v as NodeRequest.encryptMsg;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptMsg');
  }

  public static encryptFile = (v: any, data: any): NodeRequest.encryptFile => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]') && hasProp(v, 'filename', 'string') && hasData(data)) {
      return v as NodeRequest.encryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptFile');
  }

  public static decryptFile = (v: any, data: any): NodeRequest.decryptFile => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'msgPwd', 'string?') && hasProp(v, 'passphrases', 'string[]') && hasData(data)) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

  public static decryptMsg = (v: any, data: any): NodeRequest.decryptMsg => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'msgPwd', 'string?') && hasProp(v, 'passphrases', 'string[]') && hasData(data)) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

}

const isObj = (v: any): v is Obj => {
  return v && typeof v === 'object';
}

const hasProp = (v: Obj, name: string, type: 'string[]' | 'object' | 'string' | 'number' | 'string?' | 'PrvKeyInfo[]') => {
  if (!isObj(v)) {
    return false;
  }
  if (type === 'number' || type === 'string') {
    return typeof v[name] === type;
  }
  if (type === 'string?') {
    return typeof v[name] === 'string' || typeof v[name] === 'undefined';
  }
  if (type === 'string[]') {
    return Array.isArray(v[name]) && v[name].map((x: any) => typeof x === 'string');
  }
  if (type === 'PrvKeyInfo[]') {
    return Array.isArray(v[name]) && v[name].map((ki: any) => hasProp(ki, 'private', 'string') && hasProp(ki, 'longid', 'string'));
  }
  if (type === 'object') {
    return isObj(v[name]);
  }
  return false;
}

const hasData = (data: any): data is string => {
  return typeof data === 'string';
}
