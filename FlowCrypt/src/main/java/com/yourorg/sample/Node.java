package com.yourorg.sample;

import android.content.res.AssetManager;

import org.apache.commons.io.IOUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

public class Node {

  public static void start(AssetManager am) {
    NativeNodeWrapper.startIfNotRunning(am);
  }

  public static String request(String endpoint) {
    try {
      URL url = new URL("http://localhost:3000/" + endpoint);
      return new BufferedReader(new InputStreamReader(url.openStream())).lines().collect(Collectors.joining());
    } catch (Exception ex) {
      return ex.toString();
    }
  }

}

class NativeNodeWrapper {

  static { // Used to load the 'native-lib' library on application startup.s
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  private static boolean isRunning = false;

  public static void startIfNotRunning(final AssetManager am) {
    if(!isRunning) {
      isRunning = true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          new NativeNodeWrapper().start(am);
          isRunning = false; // if it ever stops running, set isRunning back to false
        }
      }).start();
    }
  }

  private void start(AssetManager am) {
    startNodeWithArguments(new String[]{"node", "-e", getJavaScriptSource(am)});
  }

  private static String getJavaScriptSource(AssetManager am) {
    try {
      return IOUtils.toString(am.open("js/flowcrypt-android.js"), StandardCharsets.UTF_8);
    } catch(IOException e) {
      e.printStackTrace();
      return "require('http')" +
          ".createServer((request, response) => {" +
          "   response.end('{\"error\": {\"message\": \"getAssets IOException\",\"stack\":\"Java\"}}')" +
          "}).listen(3000, 'localhost')";
    }
  }

  /**
   * A native method that is implemented by the 'native-lib' native library,
   * which is packaged with this application.
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);

}
