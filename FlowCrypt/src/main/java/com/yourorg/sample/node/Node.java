package com.yourorg.sample.node;

import android.content.res.AssetManager;

import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptFileResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.PgpKeyInfo;
import com.yourorg.sample.node.results.TestNodeResult;

import org.json.JSONObject;

import java.io.InputStream;

public class Node {

  private static NativeNode nativeNode = null;

  public static void start(AssetManager am, NodeSecrets nodeSecrets) {
    if(nativeNode == null) {
      nativeNode = new NativeNode(nodeSecrets);
    }
    nativeNode.startIfNotRunning(am);
  }

  private static <T> T request(String endpoint, JSONObject req, byte[] data, Class<T> cls) {
    if(nativeNode == null) {
      try {
        Class[] argClasses = new Class[]{Exception.class, InputStream.class, long.class};
        return cls.getDeclaredConstructor(argClasses).newInstance(new NodeNotReady("Node.js process not started yet", null), null, 0);
      } catch (Exception e) {
        throw new RuntimeException("Node.request wrong constructor definition", e);
      }
    }
    return nativeNode.request(endpoint, req, data).convertTo(cls);
  }

  public static TestNodeResult version() {
    return request("version", null, null, TestNodeResult.class);
  }

  public static EncryptMsgResult encryptMsg(byte[] data, String[] pubKeys) {
    Json req = new Json();
    req.putStringArr("pubKeys", pubKeys);
    return request("encryptMsg", req, data, EncryptMsgResult.class);
  }

  public static EncryptFileResult encryptFile(byte[] data, String[] pubKeys, String name) {
    Json req = new Json();
    req.putStringArr("pubKeys", pubKeys);
    req.putString("name", name);
    return request("encryptFile", req, data, EncryptFileResult.class);
  }

  public static DecryptMsgResult decryptMsg(byte[] data, PgpKeyInfo[] prvKeys, String[] passphrases, String msgPwd) {
    Json req = new Json();
    req.putPrvKeyInfoArr("keys", prvKeys);
    req.putStringArr("passphrases", passphrases);
    req.putString("msgPwd", msgPwd);
    return request("decryptMsg", req, data, DecryptMsgResult.class);
  }

  public static DecryptFileResult decryptFile(byte[] data, PgpKeyInfo[] prvKeys, String[] passphrases, String msgPwd) {
    Json req = new Json();
    req.putPrvKeyInfoArr("keys", prvKeys);
    req.putStringArr("passphrases", passphrases);
    req.putString("msgPwd", msgPwd);
    return request("decryptFile", req, data, DecryptFileResult.class);
  }

  public static TestNodeResult testRequest(String endpoint) {
    return request(endpoint, null, null, TestNodeResult.class);
  }

}
