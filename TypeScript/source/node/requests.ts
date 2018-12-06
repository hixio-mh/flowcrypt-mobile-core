

/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

type Obj = { [k: string]: any };

export namespace NodeRequest {

  export type encrypt = { pubKeys: string[], filename?: string };

}

export class Validate {

  public static encrypt = (v: any, data: any): NodeRequest.encrypt => {
    if (Validate.isObj(v) && Validate.hasProp(v, 'pubKeys', 'string[]') && Validate.hasProp(v, 'filename', 'string?') && typeof data === 'string') {
      return v as NodeRequest.encrypt;
    }
    throw new Error('Wrong request structure for NodeRequest.encrypt');
  }

  private static isObj = (v: any): v is Obj => {
    return v && typeof v === 'object';
  }

  private static hasProp = (v: Obj, name: string, type: 'string[]' | 'object' | 'string' | 'number' | 'string?') => {
    if (!Validate.isObj(v)) {
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
      return Validate.isObj(v[name]);
    }
    return false;
  }

}
