/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import * as EventEmitter from 'events';

let send = (msg: string) => {
  console.error(`-------------------- native bridge not present for message --------------------\n${msg}\n--------------------`);
};

try {
  const mybridgeaddon = (process as any).binding('rn_bridge');
  class MyEmitter extends EventEmitter {
    public send = function (msg: string) {
      mybridgeaddon.sendMessage(msg);
    };
  }
  const channel = new MyEmitter();
  /* var myListener =*/ mybridgeaddon.registerListener(function (msg: string) {
    channel.emit('message', msg);
  });
  send = channel.send;
} catch (e) {
  if (!(e instanceof Error) || e.message !== 'No such module: rn_bridge') {
    throw e;
  }
}

export const sendNativeMessageToJava = send;
