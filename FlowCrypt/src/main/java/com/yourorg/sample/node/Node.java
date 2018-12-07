package com.yourorg.sample.node;

import android.content.res.AssetManager;

import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptFileResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.TestNodeResult;

public class Node {

  private static NativeNode nativeNode;

  static {
    try {
      nativeNode = new NativeNode();
    } catch (Exception e) {
      e.printStackTrace(); // todo - ACRA report here
      // do not escalate the error - that will keep the rest of the app running. Not all functions need Node.js started
    }
  }

  public static void start(AssetManager am) {
    nativeNode.startIfNotRunning(am);
  }

  public static TestNodeResult version() {
    return nativeNode.request("version", null, null).convertTo(TestNodeResult.class);
  }

  public static EncryptMsgResult encryptMsg(byte[] data, String[] pubKeys) {
    Json req = new Json();
    req.putStringArr("pubKeys", pubKeys);
    return nativeNode.request("encryptMsg", req, data).convertTo(EncryptMsgResult.class);
  }

  public static EncryptFileResult encryptFile(byte[] data, String[] pubKeys, String name) {
    Json req = new Json();
    req.putStringArr("pubKeys", pubKeys);
    req.putString("name", name);
    return nativeNode.request("encryptFile", req, data).convertTo(EncryptFileResult.class);
  }

  public static DecryptMsgResult decryptMsg(byte[] data, String[] prvKeys, String[] passphrases, String msgPwd) {
    Json req = new Json();
    req.putStringArr("keys", prvKeys);
    req.putStringArr("passphrases", passphrases);
    req.putString("msgPwd", msgPwd);
    return nativeNode.request("decryptMsg", req, data).convertTo(DecryptMsgResult.class);
  }

  public static DecryptFileResult decryptFile(byte[] data, String[] prvKeys, String[] passphrases, String msgPwd) {
    Json req = new Json();
    req.putStringArr("keys", prvKeys);
    req.putStringArr("passphrases", passphrases);
    req.putString("msgPwd", msgPwd);
    return nativeNode.request("decryptFile", req, data).convertTo(DecryptFileResult.class);
  }

  public static TestNodeResult rawRequest(String endpoint) {
    return nativeNode.request(endpoint, null, null).convertTo(TestNodeResult.class);
  }

}
