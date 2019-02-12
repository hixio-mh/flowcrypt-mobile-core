/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

/// <reference path="../../../types/openpgp.d.ts" />

export const requireOpenpgp = (): typeof OpenPGP => {
  // @ts-ignore;
  if (typeof openpgp !== 'undefined') {
    // @ts-ignore;
    return openpgp; // self-contained node-mobile
  }
  return require('openpgp'); // normal desktop node, eg when running tests
};

export const requireMimeParser = (): any => {
  // @ts-ignore;
  return global['emailjs-mime-parser'];
};

export const requireMimeBuilder = (): any => {
  // global['emailjs-mime-builder'] ?
  // dereq_emailjs_mime_builder ?
  // @ts-ignore
  return global['emailjs-mime-builder'];
};

export const requireIso88592 = (): any => {
  // @ts-ignore
  return global['iso88592'];
};
