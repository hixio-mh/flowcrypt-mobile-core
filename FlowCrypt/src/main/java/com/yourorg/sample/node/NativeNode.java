package com.yourorg.sample.node;

import android.content.res.AssetManager;

import com.yourorg.sample.node.results.RawNodeResult;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpEntity;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;

import javax.net.ssl.HttpsURLConnection;

class NativeNode {

  static { // Used to load the 'native-lib' library on application startup
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  private boolean isRunning = false;
  private static volatile boolean isReady = false;
  private NodeSecret nodeSecret;

  NativeNode(NodeSecret nodeSecret) {
    this.nodeSecret = nodeSecret;
  }

  RawNodeResult request(String endpoint, JSONObject req, byte[] data) {
    long startTime = System.currentTimeMillis();
    try {
      MultipartEntityBuilder builder = MultipartEntityBuilder.create();
      builder.setMode(HttpMultipartMode.BROWSER_COMPATIBLE);
      builder.addTextBody("endpoint", endpoint);
      builder.addTextBody("request", req != null ? req.toString() : "{}");
      builder.addBinaryBody("data", new ByteArrayInputStream(data != null ? data : new byte[0]));
      URL url = new URL("https://localhost:" + nodeSecret.port + "/");
      HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
      conn.setRequestMethod("POST");
      conn.setRequestProperty("Authorization", nodeSecret.authHeader);
      conn.setRequestProperty("Connection", "Keep-Alive");
      conn.setDoInput(true);
      conn.setDoOutput(true);
      conn.setSSLSocketFactory(nodeSecret.sslSocketFactory);
      HttpEntity parts = builder.build();
      conn.addRequestProperty(parts.getContentType().getName(), parts.getContentType().getValue());
      OutputStream os = conn.getOutputStream();
      parts.writeTo(os);
      conn.connect();
      if (conn.getResponseCode() == 200) {
        return new RawNodeResult(null, conn.getInputStream(), System.currentTimeMillis() - startTime);
      } else {
        return new RawNodeResult(NodeError.fromConnection(conn), null, System.currentTimeMillis() - startTime);
      }
    } catch (java.net.ConnectException e) {
      return new RawNodeResult(new NodeNotReady("Node.js is not ready to receive connections yet", e), null, System.currentTimeMillis() - startTime);
    } catch (Exception e) {
      return new RawNodeResult(e, null, System.currentTimeMillis() - startTime);
    }
  }

  void startIfNotRunning(final AssetManager am) {
    if(!isRunning) {
      isRunning = true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          startSync(am);
          isRunning = false; // if it ever stops running, set isRunning back to false
        }
      }).start();
    }
  }

  Boolean isReady() {
    return isReady;
  }

  private void startSync(AssetManager am) {
    try {
      startNodeWithArguments(new String[]{"node", "-e", getJsSrc(am)});
    } catch (Exception e) {
      e.printStackTrace(); // todo - add acra
    }
  }

  private static String jsInitConst(String name, String value) {
    return "const " + name + " = `" + value + "`;\n";
  }

  private String getJsSrc(AssetManager am) throws Exception {
    ServerSocket ss = new ServerSocket(0);
    nodeSecret.port = ss.getLocalPort();
    ss.close();
    String src = "";
    src += jsInitConst("NODE_UNIX_SOCKET", String.valueOf(nodeSecret.unixSocketFilePath)); // not used yet
    src += jsInitConst("NODE_PORT", String.valueOf(nodeSecret.port));
    src += jsInitConst("NODE_SSL_CA", nodeSecret.ca);
    src += jsInitConst("NODE_SSL_CRT", nodeSecret.crt);
    src += jsInitConst("NODE_SSL_KEY", nodeSecret.key);
    src += jsInitConst("NODE_AUTH_HEADER", nodeSecret.authHeader);
    src += IOUtils.toString(am.open("js/flowcrypt-android.js"), StandardCharsets.UTF_8);
    return src;
  }

  /**
   * A native method that is implemented by the 'native-lib' native library
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);

  /**
   * A native method that is implemented by the 'native-lib' native library
   */
  @SuppressWarnings("JniMissingFunction")
  public native void sendNativeMessageToNode(String msg);

  /**
   * Will be called by native code
   */
  public static void receiveNativeMessageFromNode(String msg) {
    if(msg.startsWith("listening on ")) {
      isReady = true;
      System.out.println("NativeNode.isReady=true");
    }
    System.out.println("NODEJS-NATIVE-MSG[" + msg + "]");
  }
}

class NodeError extends Exception {

  static NodeError fromConnection(HttpsURLConnection conn) {
    int errCode;
    try {
      errCode = conn.getResponseCode();
    } catch (IOException e) {
      return new NodeError(0, e.getMessage(), null);
    }
    return NodeError.fromErrCodeAndInputStream(errCode, conn.getErrorStream());
  }

//  static NodeError fromResponse(okhttp3.Response response) { // this is needed if we want to use unix sockets
//    return NodeError.fromErrCodeAndInputStream(response.code(), response.body().byteStream());
//  }

  private static NodeError fromErrCodeAndInputStream(int errCode, InputStream is) {
    String res = new BufferedReader(new InputStreamReader(is)).lines().collect(Collectors.joining("\n"));
    try {
      JSONObject obj = new JSONObject(res);
      JSONObject error = obj.getJSONObject("error");
      String stack = error.getString("stack");
      return new NodeError(errCode, error.getString("message"), newStackTraceElement(stack));
    } catch (JSONException e) {
      return new NodeError(errCode, "Node http err without err obj",  newStackTraceElement("[RES]" + res));
    }
  }

  private NodeError(int httpErrCode, String errMsg, StackTraceElement addStackTraceElement) {
    super(Integer.valueOf(httpErrCode).toString() + " " + errMsg);
    StackTraceElement[] origStack = getStackTrace();
    StackTraceElement[] newStack = Arrays.copyOf(origStack, origStack.length + 1);
    newStack[origStack.length] = addStackTraceElement;
    setStackTrace(newStack);
  }

  static private StackTraceElement newStackTraceElement(String data) {
    return new StackTraceElement("=========================", "\n[node.js] " + data, "flowcrypt-android.js", -1);
  }

}

class NodeNotReady extends Exception {
  NodeNotReady(String message, Throwable cause) {
    super(message, cause);
  }
  NodeNotReady(String message) {
    super(message);
  }
}
