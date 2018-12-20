/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { IncomingMessage } from 'http';
import { HttpClientErr, Buffers } from './fmt';
import { Debug } from './endpoints';

type ParseRes = { endpoint: string, data: Buffers, request: {} };
const NEWLINE = Buffer.from('\n');

export const parseReq = (r: IncomingMessage): Promise<ParseRes> => new Promise((resolve, reject) => {
  const initBuffers: Buffers = [];
  const data: Buffers = [];
  let newlinesEncountered = 0;
  let totalLen = 0;
  r.on('data', (chunk: Buffer) => {
    totalLen += chunk.length;
    console.log(`Received a chunk of data. Byte length: ${chunk.length}`);
    Debug.printChunk('beginning of chunk in bytes', chunk);
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
    const initLen = initBuffers.map(b => b.length).reduce((a, b) => a + b);
    const dataLen = data.map(b => b.length).reduce((a, b) => a + b);
    console.log(`Reached end of stream. Total stream length: ${totalLen} of which ${initLen} was first two lines and ${dataLen} was data`);
    Debug.printChunk('initBuffers in bytes', Buffer.concat(initBuffers));
    Debug.printChunk('dataBuffers in bytes', Buffer.concat(data));
    console.log('initBuffers', Buffer.concat(initBuffers).toString().split(''));
    console.log('data', Buffer.concat(data).toString().split(''))
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
