/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { IncomingMessage } from 'http';
import { HttpClientErr } from './fmt';

type ParseRes = { endpoint: string, data: Buffer, request: {} };
const NEWLINE = Buffer.from('\n');

export const parseReq = (r: IncomingMessage): Promise<ParseRes> => new Promise((resolve, reject) => {
  const initChunks: Buffer[] = [];
  const dataChunks: Buffer[] = [];
  let newlinesEncountered = 0;
  r.on('data', (chunk: Buffer) => {
    let byteOffset = 0;
    while (newlinesEncountered < 2) {
      const nextNewlineIndex = chunk.indexOf(NEWLINE, byteOffset);
      if (nextNewlineIndex === -1) {
        initChunks.push(chunk);
        return;
      }
      const endOfLine = nextNewlineIndex + NEWLINE.length;
      initChunks.push(chunk.slice(byteOffset, endOfLine));
      byteOffset = endOfLine;
      newlinesEncountered++;
    }
    dataChunks.push(chunk.slice(byteOffset));
  });
  r.on('end', () => {
    if (initChunks.length && dataChunks.length) {
      try {
        const [endpointLine, requestLine] = Buffer.concat(initChunks).toString().split(Buffer.from(NEWLINE).toString());
        resolve({
          endpoint: endpointLine.trim(),
          request: JSON.parse(requestLine.trim()),
          data: Buffer.concat(dataChunks),
        });
      } catch (e) {
        reject(new HttpClientErr('cannot parse request part as json'));
      }
    } else {
      reject(new HttpClientErr('missing endpoint or request part'));
    }

  });
})
