package com.yourorg.sample;

import android.annotation.SuppressLint;
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

  // Used to load the 'native-lib' library on application startup.
  static {
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  //We just want one instance of node running in the background.
  public static boolean nodeIsRunning = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

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

    final Button buttonVersions = (Button) findViewById(R.id.btVersions);
    final TextView textViewVersions = (TextView) findViewById(R.id.tvVersions);

    buttonVersions.setOnClickListener(new View.OnClickListener() {
      @SuppressLint("StaticFieldLeak")
      public void onClick(View v) {

        //Network operations should be done in the background.
        new AsyncTask<Void,Void,String>() {
          @Override
          protected String doInBackground(Void... params) {
            StringBuilder nodeResponse = new StringBuilder();
            try {
              URL localNodeServer = new URL("http://localhost:3000/");
              BufferedReader in = new BufferedReader(new InputStreamReader(localNodeServer.openStream()));
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
            textViewVersions.setText(result);
          }
        }.execute();

      }
    });

  }

  /**
   * A native method that is implemented by the 'native-lib' native library,
   * which is packaged with this application.
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);
}
