/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Str } from '../core/common.js';

export class HttpAuthErr extends Error { }
export class HttpClientErr extends Error { }

export const fmtRes = (response: {}, data?: string | Uint8Array): string => {
  let formatted = JSON.stringify(response) + '\n';
  if (typeof data !== 'undefined') {
    formatted += (typeof data === 'string' ? data : Str.fromUint8(data));
  }
  return formatted;
}

export const fmtErr = (e: any): string => {
  return JSON.stringify({
    error: {
      message: String(e),
      stack: e && typeof e === 'object' ? e.stack || '' : ''
    }
  });
};

export const indexHtml = `
<html><head></head><body>
<form method="POST" target="_blank" enctype="multipart/form-data">
  <input type="text" placeholder="endpoint" name="endpoint"><br>
  <textarea name="request" cols="160" rows="4" placeholder="json"></textarea><br>
  <input name="data" type="file"> <button type="submit">submit post request</button>
</form>
</body></html>`;
