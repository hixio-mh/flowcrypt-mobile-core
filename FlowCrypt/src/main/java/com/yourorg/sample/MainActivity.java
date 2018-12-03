package com.yourorg.sample;

import android.content.res.AssetManager;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import org.apache.commons.io.IOUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

  static { // Used to load the 'native-lib' library on application startup.s
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  public static boolean nodeIsRunning = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    startNodeIfNeeded();

    final Button btnVersions = (Button) findViewById(R.id.btnVersions);
    final Button btnTest25519 = (Button) findViewById(R.id.btnTest25519);
    final Button btnTest2048 = (Button) findViewById(R.id.btnTest2048);
    final Button btnTest4096 = (Button) findViewById(R.id.btnTest4096);
    final TextView tvResult = (TextView) findViewById(R.id.tvResult);

    btnVersions.setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        fetchAndRenderResult("version", tvResult);
      }
    });
    btnTest25519.setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        fetchAndRenderResult("test25519", tvResult);
      }
    });
    btnTest2048.setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        fetchAndRenderResult("test2048", tvResult);
      }
    });
    btnTest4096.setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        fetchAndRenderResult("test4096", tvResult);
      }
    });
  }

  public void startNodeIfNeeded() {
    if(!nodeIsRunning) {
      nodeIsRunning = true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          try {
            AssetManager assets = getApplicationContext().getAssets();
            String jsSrc = IOUtils.toString(assets.open("js/flowcrypt-android.js"), StandardCharsets.UTF_8);
            startNodeWithArguments(new String[]{"node", "-e", jsSrc});
          } catch (IOException e) {
            e.printStackTrace();
          }
        }
      }).start();
    }
  }

  public static void fetchAndRenderResult(final String endpoint, final TextView tvResult) {
    //Network operations should be done in the background.
    new AsyncTask<Void,Void,String>() {
      @Override
      protected String doInBackground(Void... params) {
        StringBuilder nodeResponse = new StringBuilder();
        try {
          URL nodeUrl = new URL("http://localhost:3000/" + endpoint);
          BufferedReader in = new BufferedReader(new InputStreamReader(nodeUrl.openStream()));
          String inputLine;
          while ((inputLine = in.readLine()) != null) {
            nodeResponse.append(inputLine);
          }
          in.close();
        } catch (Exception ex) {
          nodeResponse = new StringBuilder(ex.toString());
        }
        return nodeResponse.toString();
      }
      @Override
      protected void onPostExecute(String result) {
        System.out.println(result);
        tvResult.setText(result);
      }
    }.execute();
  }

  /**
   * A native method that is implemented by the 'native-lib' native library,
   * which is packaged with this application.
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);
}
