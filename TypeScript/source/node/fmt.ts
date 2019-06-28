/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { MsgBlockType, MsgBlock } from '../core/mime';
import { Str } from '../core/common';
import { Pgp } from '../core/pgp';

export class HttpAuthErr extends Error { }
export class HttpClientErr extends Error { }

export type Buffers = (Buffer | Uint8Array)[];

export const isContentBlock = (t: MsgBlockType) => t === 'plainText' || t === 'decryptedText' || t === 'plainHtml' || t === 'decryptedHtml' || t === 'signedMsg';

const seamlessLockBg = 'iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAMAAAAPdrEwAAAAh1BMVEXw8PD////w8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD7MuHIAAAALXRSTlMAAAECBAcICw4QEhUZIyYqMTtGTV5kdn2Ii5mfoKOqrbG0uL6/xcnM0NTX2t1l7cN4AAAB0UlEQVR4Ae3Y3Y4SQRCG4bdHweFHRBTBH1FRFLXv//qsA8kmvbMdXhh2Q0KfknpSCQc130c67s22+e9+v/+d84fxkSPH0m/+5P9vN7vRV0vPfx7or1NB23e99KAHuoXOOc6moQsBwNN1Q9g4Wdh1uq3MA7Qn0+2ylAt7WbWpyT+Wo8roKH6v2QhZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2ghZ2gjZ2AUNOLmwgQdogEJ2dnF3UJdU3WjqO/u96aYtVd/7jqvIyu76G5se6GaY7tNNcy5d7se7eWVnDz87fMkuVuS8epF6f9NPObPY5re9y4N1/vya9Gr3se2bfvl9M0mkyZdv077p+a/3z4Meby5Br4NWiV51BaiUqfLro9I3WiR61RVcffwfXI7u5zZ20EOA82Uu8x3SlrSwXQuBSvSqK0AletUVoBK96gpIwlZy0MJWctDCVnLQwlZy0MJWctDCVnLQwlZy0MJWctDCVnLQwlZy0MJWctDCVnLQwlZy0MJWckIletUVIJJxITN6wtZd2EI+0NquyIJOnUpFVvRpcwmV6FVXgEr0qitAJXrVFaASveoKUIledQWoRK+6AlSiV13BP+/VVbky7Xq1AAAAAElFTkSuQmCC';

const fmtMsgContentBlockAsHtml = (sanitizedHtmlContent: string, frame: 'green' | 'gray' | 'red' | 'plain') => {
  const generalCss = `background: white;padding-left: 10px;min-height: 38px;padding-top: 6px;padding-bottom: 6px;`;
  let frameCss: string;
  if (frame === 'green') {
    frameCss = `border: 1px solid #f0f0f0;border-left: 4px solid #31A217;background-image: url(data:image/png;base64,${seamlessLockBg});`;
  } else if (frame === 'red') {
    frameCss = `border: 1px solid #f0f0f0;border-left: 4px solid #d14836;`;
  } else if (frame === 'plain') {
    frameCss = `border: 1px solid #f0f0f0;`;
  } else { // gray
    frameCss = `border: 1px solid #f0f0f0;border-left: 4px solid #989898;`;
  }
  return `<div style="${generalCss}${frameCss}">${sanitizedHtmlContent}</div>\n`;
}

export const stripHtmlRootTags = (html: string) => { // todo - this is very rudimentary, use a proper parser
  html = html.replace(/<\/?html[^>]*>/g, ''); // remove opening and closing html tags
  html = html.replace(/<head[^>]*>.*<\/head>/g, '') // remove the whole head section
  html = html.replace(/<\/?body[^>]*>/g, ''); // remove opening and closing body tags
  return html.trim();
}

export const fmtContentBlock = (contentBlocks: MsgBlock[]): { contentBlock: MsgBlock, text: string } => {
  let msgContentAsHtml = '';
  let msgContentAsText = '';
  for (const block of contentBlocks) {
    if (block.type === 'decryptedText') {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(Str.asEscapedHtml(block.content.toString()), 'green');
      msgContentAsText += block.content.toString();
    } else if (block.type === 'decryptedHtml') {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(stripHtmlRootTags(block.content.toString()), 'green');
      msgContentAsText += block.content.toString(); // todo - convert html to text
    } else if (block.type === 'plainText') {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(Str.asEscapedHtml(block.content.toString()), 'plain');
      msgContentAsText += block.content.toString();
    } else if (block.type === 'plainHtml') {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(stripHtmlRootTags(block.content.toString()), 'plain');
      msgContentAsText += block.content.toString(); // todo - convert html to text
    } else if (block.type === 'signedMsg') {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(block.content.toString(), 'gray');
      msgContentAsText += block.content.toString();
    } else {
      msgContentAsHtml += fmtMsgContentBlockAsHtml(block.content.toString(), 'plain');
      msgContentAsText += block.content.toString();
    }
  }
  return { contentBlock: Pgp.internal.msgBlockObj('plainHtml', msgContentAsHtml), text: msgContentAsText };
}

export const fmtRes = (response: {}, data?: Buffer | Uint8Array): Buffers => {
  const buffers: (Buffer | Uint8Array)[] = [];
  buffers.push(Buffer.from(JSON.stringify(response)));
  buffers.push(Buffer.from('\n'));
  if (data) {
    buffers.push(data);
  }
  return buffers;
}

export const fmtErr = (e: any) => Buffer.concat(fmtRes({
  error: {
    message: String(e),
    stack: e && typeof e === 'object' ? e.stack || '' : ''
  }
}));

export const indexHtml = Buffer.from(`
<html><head></head><body>
<form method="POST" target="_blank" enctype="multipart/form-data">
  <input type="text" placeholder="endpoint" name="endpoint"><br>
  <textarea name="request" cols="160" rows="4" placeholder="json"></textarea><br>
  <input name="data" type="file"> <button type="submit">submit post request</button>
</form>
</body></html>`);
