/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { IncomingMessage } from 'http';
import { HttpClientErr } from './fmt';

type DictOfArraysOfBuffers = { [partName: string]: Buffer[] };
type ParseRes = { endpoint: string, data: Buffer, request: {} };

const NEWLINE = Buffer.from("\r\n");
const DOUBLEQUOTE = '"'.charCodeAt(0);
const CONTENT_TYPE = Buffer.from('Content-Type: ');
const CONTENT_DISPOSITION = Buffer.from('Content-Disposition: form-data; name="');

const finish = (parts: DictOfArraysOfBuffers, resolve: (r: ParseRes) => void, reject: (e: Error) => void) => {
  if (parts['endpoint'] && parts['request'] && parts['data']) {
    try {
      const request = JSON.parse(Buffer.concat(parts['request']).toString());
      resolve({
        endpoint: Buffer.concat(parts['endpoint']).toString(),
        request,
        data: Buffer.concat(parts['data']),
      });
    } catch (e) {
      reject(new HttpClientErr('cannot parse request part as json'));
    }
  } else {
    reject(new HttpClientErr('missing endpoint or request part'));
  }
}

const getBoundaries = (r: IncomingMessage): { newPartBeginMarker: Buffer, streamEndMarker: Buffer } => {
  const contentType = r.headers['content-type'];
  if (!contentType) {
    throw new HttpClientErr('could not figure out content type');
  }
  const boundary = (contentType.match(/^multipart\/form-data; boundary=(.+)$/) || [])[1];
  if (!boundary || boundary.length < 5 || boundary.length > 72) {
    throw new HttpClientErr('could not figure out content type boundary');
  }
  return { newPartBeginMarker: Buffer.from(`--${boundary}${NEWLINE.toString()}`), streamEndMarker: Buffer.from(`--${boundary}--`) };
}

// todo - this converts back and forth between buffers and strings for parsing. We should just stick to buffer

export const parseReq = (r: IncomingMessage): Promise<ParseRes> => new Promise((resolve, reject) => {

  const { newPartBeginMarker, streamEndMarker } = getBoundaries(r);
  let currentlyParsingPartHeaders = false;
  let currentPartName = '';
  let previousChunkLeftover = Buffer.from([]);
  let encounteredEndMarker = false;
  let parts: DictOfArraysOfBuffers = {};
  let finished = false;

  r.on('data', (chunk: Buffer) => {
    if (finished) {
      return;
    }
    chunk = Buffer.concat([previousChunkLeftover, chunk]);
    while (true) {
      // console.log(`currentPartName=${currentPartName},currentlyParsingPartHeaders=${currentlyParsingPartHeaders},encounteredEndBoundary=${encounteredEndMarker}`);
      // console.log(`[loop.chunk]${chunk.toString().replace(/\r/g, '\\r').replace(/\n/g, '\\n')}[/loop.chunk]`);
      if (currentlyParsingPartHeaders) {
        const nextNewlineIndex = chunk.indexOf(NEWLINE);
        if (nextNewlineIndex !== -1) { // whole line available
          const headerLine = chunk.slice(0, nextNewlineIndex);
          chunk = chunk.slice(nextNewlineIndex + NEWLINE.length); // remove line from chunk
          if (headerLine.indexOf(CONTENT_TYPE) === 0) {
            continue; // ignore content type header, everything is just bytes
          }
          if (headerLine.indexOf(CONTENT_DISPOSITION) === 0) {
            const nameBegin = headerLine.slice(CONTENT_DISPOSITION.length);
            const nameEndIndex = nameBegin.indexOf(DOUBLEQUOTE);
            if (nameEndIndex === -1) {
              reject(new HttpClientErr("Content-disposition name parameter not properly quoted"));
              finished = true;
              return;
            }
            currentPartName = nameBegin.slice(0, nameEndIndex).toString();
            parts[currentPartName] = [];
            continue;
          }
          if (headerLine.length === 0) {
            currentlyParsingPartHeaders = false;
            continue;
          }
        }
      }
      const newPartBeginMarkerIndex = chunk.indexOf(newPartBeginMarker);
      if (newPartBeginMarkerIndex !== -1) { // found next part begin marker
        if (!currentPartName && newPartBeginMarkerIndex > 0) {
          reject(new HttpClientErr("Unexpected data before begin marker"));
          finished = true;
          return;
        }
        if (currentPartName) {
          parts[currentPartName].push(chunk.slice(0, newPartBeginMarkerIndex - NEWLINE.length));
        }
        chunk = chunk.slice(newPartBeginMarkerIndex + newPartBeginMarker.length);
        currentlyParsingPartHeaders = true;
        continue;
      } else { // not found any new part marker
        const streamEndMarkerIndex = chunk.indexOf(streamEndMarker);
        if (streamEndMarkerIndex !== -1) { // found ending marker
          encounteredEndMarker = true;
          if (!currentPartName) {
            reject(new HttpClientErr("Ending marker before begin marker"));
            finished = true;
            return;
          }
          parts[currentPartName].push(chunk.slice(0, streamEndMarkerIndex - NEWLINE.length));
          finish(parts, resolve, reject);
          finished = true;
          return;
        } else {  // not found ending marker
          previousChunkLeftover = chunk; // this is just a chunk. Maybe we can find a marker in next chunk
          return;
        }
      }
    }
  });
  r.on('end', () => {
    if (!encounteredEndMarker) {
      reject(new HttpClientErr('Got to end of stream without encountering ending boundary'));
    }
  });
})
