package com.yourorg.sample;

import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import com.yourorg.sample.node.Node;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.TestNodeResult;

public class MainActivity extends AppCompatActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    Node.start(getAssets());

    final TextView tvResult = (TextView) findViewById(R.id.tvResult);
    final EditText etData = (EditText) findViewById(R.id.etData);

    findViewById(R.id.btnVersions).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("version", tvResult);
      }
    });
    findViewById(R.id.btnTest25519).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test25519", tvResult);
      }
    });
    findViewById(R.id.btnTest2048).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048", tvResult);
      }
    });
    findViewById(R.id.btnTest4096).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test4096", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_1M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-1M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_3M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-3M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_5M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-5M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_10M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-10M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_25M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-25M", tvResult);
      }
    });
    findViewById(R.id.btnTest2048_50M).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        testNodeAndRender("test2048-50M", tvResult);
      }
    });
    findViewById(R.id.btnEncrypt).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        encryptMsgAndRender(etData, tvResult);
      }
    });
  }

  public static void encryptMsgAndRender(final EditText etData, final TextView tvResult) {
    new AsyncTask<Void,Void,EncryptMsgResult>() {
      @Override
      protected EncryptMsgResult doInBackground(Void... params) {
        return Node.encryptMsg(etData.getText().toString().getBytes(), TestDataFactory.eccPubKeys);
      }
      @Override
      protected void onPostExecute(EncryptMsgResult encryptRes) {
        String text;
        if(encryptRes.getErr() != null) {
          text = encryptRes.getErr().getMessage();
          encryptRes.getErr().printStackTrace();
        } else {
          text = encryptRes.getEncryptedDataString();
        }
        System.out.println(text);
        text += "\n\n" + encryptRes.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();

  }

  public static void testNodeAndRender(final String endpoint, final TextView tvResult) {
    new AsyncTask<Void,Void,TestNodeResult>() {
      @Override
      protected TestNodeResult doInBackground(Void... params) {
        return Node.rawRequest(endpoint);
      }
      @Override
      protected void onPostExecute(TestNodeResult nodeResult) {
        String text;
        if(nodeResult.getErr() != null) {
          text = nodeResult.getErr().getMessage();
          nodeResult.getErr().printStackTrace();
        } else {
          text = nodeResult.getRawJsonResponse();
        }
        text += "\n\n" + nodeResult.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();
  }

}
