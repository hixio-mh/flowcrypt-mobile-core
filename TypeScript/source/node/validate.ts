/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

type Obj = { [k: string]: any };

export namespace NodeRequest {

  export type encrypt = { pubKeys: string[], filename?: string };
  export type decryptFile = { prvKeys: string[], passphrases: string[], msgPwd?: string };

}

export class Validate {

  public static encrypt = (v: any, data: any): NodeRequest.encrypt => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]') && hasProp(v, 'filename', 'string?') && hasData(data)) {
      return v as NodeRequest.encrypt;
    }
    throw new Error('Wrong request structure for NodeRequest.encrypt');
  }

  public static decryptFile = (v: any, data: any): NodeRequest.decryptFile => {
    if (isObj(v) && hasProp(v, 'prvKeys', 'string[]') && hasProp(v, 'msgPwd', 'string?') && hasProp(v, 'passphrases', 'string[]') && hasData(data)) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

}

const isObj = (v: any): v is Obj => {
  return v && typeof v === 'object';
}

const hasProp = (v: Obj, name: string, type: 'string[]' | 'object' | 'string' | 'number' | 'string?') => {
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
  if (type === 'object') {
    return isObj(v[name]);
  }
  return false;
}

const hasData = (data: any): data is string => {
  return typeof data === 'string';
}
