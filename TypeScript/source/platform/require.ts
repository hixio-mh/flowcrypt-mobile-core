/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

/// <reference path="../../../types/openpgp.d.ts" />

declare const openpgp: typeof OpenPGP;

export const requireOpenpgp = (): typeof OpenPGP => {
  return openpgp;
};

export const requireMimeParser = (): any => {
  // global['emailjs-mime-parser'] ?
  // dereq_emailjs_mime_parser ?
  return undefined; // todo
};

export const requireMimeBuilder = (): any => {
  // global['emailjs-mime-builder'] ?
  // dereq_emailjs_mime_builder ?
  return undefined; // todo
};

export const requireIso88592 = (): any => {
  // global.iso88592 ?
  // dereq_iso88592 ?
  return undefined; // todo
};
