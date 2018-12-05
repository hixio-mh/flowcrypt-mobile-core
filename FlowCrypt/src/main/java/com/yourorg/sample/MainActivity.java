package com.yourorg.sample;

import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.TextView;

public class MainActivity extends AppCompatActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    Node.start(getAssets());

    final TextView tvResult = (TextView) findViewById(R.id.tvResult);

    findViewById(R.id.btnVersions).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("version", tvResult);
      }
    });
    findViewById(R.id.btnTest25519).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test25519", tvResult);
      }
    });
    findViewById(R.id.btnTest2048).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048", tvResult);
      }
    });
    findViewById(R.id.btnTest4096).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test4096", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_1M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-1M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_3M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-3M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_5M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-5M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_10M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-10M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_25M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-25M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_50M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        renderRes("test2048-50M", tvResult);
      }
    });
  }

  public static void renderRes(final String endpoint, final TextView tvResult) {
    new AsyncTask<Void,Void,NodeRes>() {
      @Override
      protected NodeRes doInBackground(Void... params) {
        return Node.request(endpoint);
      }
      @Override
      protected void onPostExecute(NodeRes nodeRes) {
        String text;
        if(nodeRes.getErr() != null) {
          text = nodeRes.getErr().getMessage();
          nodeRes.getErr().printStackTrace();
        } else {
          text = nodeRes.getString();
        }
        text += "\n\n" + nodeRes.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();
  }

}
