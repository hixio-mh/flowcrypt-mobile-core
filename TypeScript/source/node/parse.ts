/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { IncomingMessage } from 'http';
import { HttpClientErr, Buffers } from './fmt';

type ParseRes = { endpoint: string, data: Buffers, request: {} };
const NEWLINE = Buffer.from('\n');

export const parseReq = (r: IncomingMessage): Promise<ParseRes> => new Promise((resolve, reject) => {
  const initBuffers: Buffers = [];
  const data: Buffers = [];
  let newlinesEncountered = 0;
  r.on('data', (chunk: Buffer) => {
    let byteOffset = 0;
    while (newlinesEncountered < 2) {
      const nextNewlineIndex = chunk.indexOf(NEWLINE, byteOffset);
      if (nextNewlineIndex === -1) {
        initBuffers.push(chunk);
        return;
      }
      const endOfLine = nextNewlineIndex + NEWLINE.length;
      initBuffers.push(chunk.slice(byteOffset, endOfLine));
      byteOffset = endOfLine;
      newlinesEncountered++;
    }
    data.push(chunk.slice(byteOffset));
  });
  r.on('end', () => {
    if (initBuffers.length && data.length) {
      try {
        const [endpointLine, requestLine] = Buffer.concat(initBuffers).toString().split(Buffer.from(NEWLINE).toString());
        resolve({
          endpoint: endpointLine.trim(),
          request: JSON.parse(requestLine.trim()),
          data,
        });
      } catch (e) {
        reject(new HttpClientErr('cannot parse request part as json'));
      }
    } else {
      reject(new HttpClientErr('missing endpoint or request part'));
    }

  });
})
