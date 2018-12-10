/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { IncomingMessage } from 'http';
import { HttpClientErr } from './fmt';

export const parseReq = (r: IncomingMessage): Promise<{ endpoint: string, data?: string, request: {} }> => new Promise((resolve, reject) => {
  const contentType = r.headers['content-type'];
  if (!contentType) {
    throw new HttpClientErr('could not figure out content type');
  }
  const boundary = (contentType.match(/^multipart\/form-data; boundary=(.+)$/) || [])[1];
  if (!boundary || boundary.length < 5 || boundary.length > 72) {
    throw new HttpClientErr('could not figure out content type boundary');
  }
  const startBoundary = `--${boundary}`;
  const endBoundary = `--${boundary}--`;
  let currentlyParsingPartHeaders = false;
  let currentPartName = '';
  let chunkLeftover = '';
  let encounteredEndBoundary = false;
  let parts: { [partName: string]: string } = {};
  r.on('data', chunk => {
    // console.log(`[chunk]${chunk.toString()}[/chunk]`);
    for (const line of chunk.toString().split(/\r?\n/)) {
      // console.log(`[for currentPartName=${currentPartName}, currentlyParsingPartHeaders=${currentlyParsingPartHeaders}, encounteredEndBoundary=${encounteredEndBoundary}]`);
      // console.log(`[line]${line}[/line]`);
      const realLine = chunkLeftover + line;
      // console.log(`[realLine]${realLine}[/realLine]`);
      if (realLine === startBoundary) {
        currentlyParsingPartHeaders = true;
        chunkLeftover = '';
        continue;
      }
      if (realLine === endBoundary) {
        encounteredEndBoundary = true;
        if (parts['endpoint'] && parts['request']) {
          try {
            const request = JSON.parse(parts['request']);
            resolve({ endpoint: parts['endpoint'], request, data: parts['data'] });
          } catch (e) {
            reject(new HttpClientErr('cannot parse request part as json'));
          }
        } else {
          reject(new HttpClientErr('missing endpoint or request part'));
        }
        break;
      }
      if (currentlyParsingPartHeaders) {
        const contentDispositionMatch = realLine.match(/^Content-Disposition: form-data; name="([a-z]+)"/);
        if (contentDispositionMatch) {
          currentPartName = contentDispositionMatch[1];
          parts[currentPartName] = ''; // initialize part
          chunkLeftover = '';
          continue;
        }
        if (realLine === 'Content-Type: application/octet-stream' || realLine === 'Content-Type: text/plain') {
          chunkLeftover = '';
          continue;
        }
        if (realLine === '') {
          currentlyParsingPartHeaders = false;
          continue;
        }
        chunkLeftover = realLine;
        continue;
      }
      // this is data content
      if (!parts[currentPartName]) {
        parts[currentPartName] = realLine;
      } else {
        parts[currentPartName] += '\n' + realLine; // add back the \n we stole when splitting buffer
      }
    }
  });
  r.on('end', () => {
    if (!encounteredEndBoundary) {
      reject(new HttpClientErr('Got to end of stream without encountering ending boundary'));
    }
  });
})
