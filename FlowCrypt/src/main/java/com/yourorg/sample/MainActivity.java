package com.yourorg.sample;

import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import com.yourorg.sample.node.Node;
import com.yourorg.sample.node.NodeSecrets;
import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.MsgBlock;
import com.yourorg.sample.node.results.MsgBlockMeta;
import com.yourorg.sample.node.results.TestNodeResult;

public class MainActivity extends AppCompatActivity {

  private String newTitle = "Node";
  Handler newTitleHandler = new Handler(new Handler.Callback() {
    @Override
    public boolean handleMessage(Message msg) {
      setTitle(newTitle);
      return true;
    }
  });

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    asyncGenSecretsAndStartNode();

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
    findViewById(R.id.btnDecryptFile).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        decryptFileAndRender(etData, tvResult);
      }
    });
    findViewById(R.id.btnDecryptMsg).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        decryptMsgAndRender(etData, tvResult);
      }
    });
  }

  public void asyncGenSecretsAndStartNode() {
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          newTitle = "Generating node secrets..";
          newTitleHandler.sendEmptyMessage(0);
          long secretsStart = System.currentTimeMillis();
          NodeSecrets nodeSecrets = new NodeSecrets();
          System.out.println("Generating secrets took " + (System.currentTimeMillis() - secretsStart) + "ms");
          newTitle = "Starting Node..";
          newTitleHandler.sendEmptyMessage(0);
          long nodeStart = System.currentTimeMillis();
          Node.start(getAssets(), nodeSecrets);
          System.out.println("Starting node took additional " + (System.currentTimeMillis() - nodeStart) + "ms");
          newTitle = "Node started";
          newTitleHandler.sendEmptyMessage(0);
        } catch(Exception e) {
          throw new RuntimeException("Could not initialize Node", e);
        }
      }
    }).start();
  }

  public static void encryptMsgAndRender(final EditText etData, final TextView tvResult) {
    new AsyncTask<Void,Void,EncryptMsgResult>() {
      @Override
      protected EncryptMsgResult doInBackground(Void... params) {
        return Node.encryptMsg(etData.getText().toString().getBytes(), TestData.eccPubKeys);
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

  public static void decryptMsgAndRender(final EditText etData, final TextView tvResult) {
    new AsyncTask<Void,Void,DecryptMsgResult>() {
      @Override
      protected DecryptMsgResult doInBackground(Void... params) {
        return Node.decryptMsg(etData.getText().toString().getBytes(), TestData.eccPrvKeyInfo, TestData.passphrases, null);
      }
      @Override
      protected void onPostExecute(DecryptMsgResult decryptFileRes) {
        String text;
        if(decryptFileRes.getErr() != null) {
          text = decryptFileRes.getErr().getMessage();
          decryptFileRes.getErr().printStackTrace();
        } else if(decryptFileRes.getDecryptErr() != null) {
          text = decryptFileRes.getDecryptErr().type + ": " + decryptFileRes.getDecryptErr().error;
        } else {
          text = "msgBlockMeta.length: " + decryptFileRes.getAllBlockMetas().length + "\n";
          for(MsgBlockMeta msgBlockMeta: decryptFileRes.getAllBlockMetas()) {
            text += "blockMeta: " + msgBlockMeta.type + ", length: " + msgBlockMeta.length + "\n";
          }
          for (MsgBlock block = decryptFileRes.getNextBlock(); block != null; block = decryptFileRes.getNextBlock()) {
            text += "----- block " + block.getType() + " ------\n" + block.getContent() + "\n\n";
          }
        }
        System.out.println(text);
        text += "\n\n" + decryptFileRes.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();
  }

  public static void decryptFileAndRender(final EditText etData, final TextView tvResult) {
    new AsyncTask<Void,Void,DecryptFileResult>() {
      @Override
      protected DecryptFileResult doInBackground(Void... params) {
        return Node.decryptFile(etData.getText().toString().getBytes(), TestData.eccPrvKeyInfo, TestData.passphrases, null);
      }
      @Override
      protected void onPostExecute(DecryptFileResult decryptFileRes) {
        String text;
        if(decryptFileRes.getErr() != null) {
          text = decryptFileRes.getErr().getMessage();
          decryptFileRes.getErr().printStackTrace();
        } else if(decryptFileRes.getDecryptErr() != null) {
          text = decryptFileRes.getDecryptErr().type + ": " + decryptFileRes.getDecryptErr().error;
        } else {
          text = decryptFileRes.getDecryptedDataString();
        }
        System.out.println(text);
        text += "\n\n" + decryptFileRes.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();
  }

  public static void testNodeAndRender(final String endpoint, final TextView tvResult) {
    new AsyncTask<Void,Void,TestNodeResult>() {
      @Override
      protected TestNodeResult doInBackground(Void... params) {
        return Node.testRequest(endpoint);
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
