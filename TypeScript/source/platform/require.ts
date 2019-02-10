/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

/// <reference path="../../../types/openpgp.d.ts" />

export const requireOpenpgp = (): typeof OpenPGP => {
  // @ts-ignore;
  return openpgp;
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
