/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

import * as EventEmitter from 'events';

var mybridgeaddon = (process as any).binding('rn_bridge');

class MyEmitter extends EventEmitter {
  public send = function (msg: string) {
    mybridgeaddon.sendMessage(msg);
  };
}

const channel = new MyEmitter();

/* var myListener =*/ mybridgeaddon.registerListener(function (msg: string) {
  channel.emit('message', msg);
});

export const sendNativeMessageToJava = channel.send;
