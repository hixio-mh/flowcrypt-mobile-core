/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

export class HttpAuthErr extends Error { }
export class HttpClientErr extends Error { }

export const fmtRes = (response: {}, data?: Buffer): Buffer => {
  const buffers: Buffer[] = [];
  buffers.push(Buffer.from(JSON.stringify(response)));
  buffers.push(Buffer.from('\n'));
  if (data) {
    buffers.push(data);
  }
  return Buffer.concat(buffers);
}

export const fmtErr = (e: any): string => {
  return JSON.stringify({
    error: {
      message: String(e),
      stack: e && typeof e === 'object' ? e.stack || '' : ''
    }
  });
};

export const indexHtml = Buffer.from(`
<html><head></head><body>
<form method="POST" target="_blank" enctype="multipart/form-data">
  <input type="text" placeholder="endpoint" name="endpoint"><br>
  <textarea name="request" cols="160" rows="4" placeholder="json"></textarea><br>
  <input name="data" type="file"> <button type="submit">submit post request</button>
</form>
</body></html>`);
