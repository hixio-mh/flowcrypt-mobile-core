package com.yourorg.sample;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.TextView;

import com.yourorg.sample.api.retrofit.NodeRequestBody;
import com.yourorg.sample.api.retrofit.RequestService;
import com.yourorg.sample.api.retrofit.RetrofitHelper;
import com.yourorg.sample.api.retrofit.request.model.DecryptModel;
import com.yourorg.sample.api.retrofit.request.model.Pubkeys;
import com.yourorg.sample.api.retrofit.response.models.Version;
import com.yourorg.sample.node.Node;
import com.yourorg.sample.node.NodeSecret;
import com.yourorg.sample.node.NodeSecretCerts;
import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptFileResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.MsgBlock;
import com.yourorg.sample.node.results.PgpKeyInfo;
import com.yourorg.sample.node.results.RawNodeResult;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.UnsupportedEncodingException;
import java.util.Arrays;

import okhttp3.RequestBody;
import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

  private static final TestData testData = new TestData();
  private final String nodeSecretsCacheFilename = "flowcrypt-node-secrets-cache";
  private final String testMsg = "this is ~\na test for\n\ndecrypting\nunicode:\u03A3\nthat's all";
  private final String testMsgHtml = "this is ~<br>a test for<br><br>decrypting<br>unicode:\u03A3<br>that&#39;s all";
//  final private String testMsgShort = "abc\n\u03A3";

  private String newTitle = "Node";
  Handler newTitleHandler = new Handler(new Handler.Callback() {
    @Override
    public boolean handleMessage(Message msg) {
      setTitle(newTitle);
      return true;
    }
  });
  private String resultText;
  private TextView tvResult;
  Handler newResultTextHandler = new Handler(new Handler.Callback() {
    @Override
    public boolean handleMessage(Message msg) {
      tvResult.setText(resultText);
      return true;
    }
  });
  private boolean hasTestFailure;
  private NodeSecret nodeSecret;

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    asyncGenSecretsAndStartNode();

    tvResult = findViewById(R.id.tvResult);

    findViewById(R.id.btnVersion).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        getVersionsAndRender();
      }
    });
    findViewById(R.id.btnAllTests).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        runAllTestsAndRender();
      }
    });
  }

  public void asyncGenSecretsAndStartNode() {
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          long start = System.currentTimeMillis();
          newTitleEvent("Loading cache..");
          NodeSecretCerts certsCache = nodeSecretCertsCacheLoad();
          long secretsStart = System.currentTimeMillis();
          if (certsCache == null) {
            newTitleEvent("Generating node secrets..");
            nodeSecret = new NodeSecret(getFilesDir().getAbsolutePath());
            System.out.println("Generating secrets took " + (System.currentTimeMillis() - secretsStart) + "ms");
            // remember to cache node secrets for faster startup time
            nodeSecretCertsCacheSave(nodeSecret.getCache());
          } else {
            newTitleEvent("Loading node secrets..");
            nodeSecret = new NodeSecret(getFilesDir().getAbsolutePath(), certsCache);
            System.out.println("Loading secrets took " + (System.currentTimeMillis() - secretsStart) + "ms");
          }
          newTitleEvent("Starting Node..");
          long nodeStart = System.currentTimeMillis();
          Node.start(getAssets(), nodeSecret);
          System.out.println("Starting node took additional " + (System.currentTimeMillis() - nodeStart) + "ms");
          newTitleEvent("Waiting for Node to become ready..");
          long readyStart = System.currentTimeMillis();
          Node.waitUntilReady();
          System.out.println("Waiting for node to be ready took took additional " + (System.currentTimeMillis() - readyStart) + "ms");
          newTitleEvent("Node ready from " + (certsCache == null ? "scratch" : "cache") + " (" + (System.currentTimeMillis() - start) + "ms)");
        } catch (Exception e) {
          throw new RuntimeException("Could not initialize Node", e);
        }
      }
    }).start();
  }

  public void newTitleEvent(String title) {
    System.out.println("newTitleEvent: " + title);
    newTitle = title;
    newTitleHandler.sendEmptyMessage(0);
  }

  private void addResultLine(String actionName, long ms, String result, boolean isFinal) {
    if (!result.equals("ok") && !result.equals("success")) {
      hasTestFailure = true;
      result = "***FAIL*** " + result;
    }
    String line = (isFinal ? "-----------------\n" : "") + actionName + " [" + ms + "ms] " + result + "\n";
    System.out.print(line);
    resultText += line;
    newResultTextHandler.sendEmptyMessage(0);
  }

  private void addResultLine(String actionName, long ms, Throwable e, boolean isFinal) {
    e.printStackTrace(); // todo - acra
    addResultLine(actionName, ms, e.getClass().getName() + ": " + e.getMessage(), isFinal);
  }

  private void addResultLine(String actionName, RawNodeResult result) {
    if (result.getErr() != null) {
      addResultLine(actionName, result.ms, result.getErr(), false);
    } else {
      addResultLine(actionName, result.ms, "ok", false);
    }
  }

  private void addResultLine(String actionName, long time, Exception e) {
    if (e != null) {
      addResultLine(actionName, time, e, false);
    } else {
      addResultLine(actionName, time, "ok", false);
    }
  }

  private String encryptMsgAndRender(String actionName, byte[] data, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("encryptMsg", new Pubkeys(testData.getMixedPubKeys()), data);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    EncryptMsgResult encryptMsgResult = new EncryptMsgResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
    addResultLine(actionName, encryptMsgResult);
    return encryptMsgResult.getEncryptedString();
  }

  private byte[] encryptFileAndRender(String actionName, byte[] data) {
    EncryptFileResult r = Node.encryptFile(data, testData.getMixedPubKeys(), "file.txt");
    addResultLine(actionName, r);
    return r.getEncryptedDataBytes();
  }

  private void decryptFileAndRender(String actionName, byte[] encryptedData, PgpKeyInfo[] prvKeys, byte[] originalData) throws UnsupportedEncodingException {
    DecryptFileResult r = Node.decryptFile(encryptedData, prvKeys, testData.passphrases(), null);
    if (r.getErr() != null) {
      addResultLine(actionName, r.ms, r.getErr(), false);
    } else if (r.getDecryptErr() != null) {
      addResultLine(actionName, r.ms, r.getDecryptErr().type + ":" + r.getDecryptErr().error, false);
    } else if (!"file.txt".equals(r.getName())) {
      addResultLine(actionName, r.ms, "wrong filename", false);
    } else if (!Arrays.equals(r.getDecryptedDataBytes(), originalData)) {
      addResultLine(actionName, r.ms, "decrypted file content mismatch", false);
    } else {
      addResultLine(actionName, r);
    }
  }

  private void decryptMsgAndRender(String actionName, byte[] data, PgpKeyInfo[] prvKeys, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("decryptMsg", new DecryptModel(prvKeys, testData.passphrases(), null), data);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    DecryptMsgResult r = new DecryptMsgResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());

//    DecryptMsgResult r = Node.decryptMsg(data, prvKeys, testData.passphrases(), null);
    if (r.getErr() != null) {
      addResultLine(actionName, r.ms, r.getErr(), false);
    } else if (r.getDecryptErr() != null) {
      addResultLine(actionName, r.ms, r.getDecryptErr().type + ":" + r.getDecryptErr().error, false);
    } else if (r.getAllBlockMetas().length != 1) {
      addResultLine(actionName, r.ms, "wrong amount of block metas: " + r.getAllBlockMetas().length, false);
    } else if (r.getAllBlockMetas()[0].length != testMsgHtml.length()) {
      addResultLine(actionName, r.ms, "wrong meta block len " + r.getAllBlockMetas()[0].length + "!=" + testMsgHtml.length(), false);
    } else if (!r.getAllBlockMetas()[0].type.equals(MsgBlock.TYPE_HTML)) {
      addResultLine(actionName, r.ms, "wrong meta block type: " + r.getAllBlockMetas()[0].type, false);
    } else {
      MsgBlock block = r.getNextBlock();
      if (block == null) {
        addResultLine(actionName, r.ms, "getNextBlock unexpectedly null", false);
      } else if (!block.getType().equals(MsgBlock.TYPE_HTML)) {
        addResultLine(actionName, r.ms, "wrong block type: " + r.getAllBlockMetas()[0].length, false);
      } else if (!block.getContent().equals(testMsgHtml)) {
        addResultLine(actionName, r.ms, "block content mismatch", false);
      } else if (r.getNextBlock() != null) {
        addResultLine(actionName, r.ms, "unexpected second block", false);
      } else {
        addResultLine(actionName, r);
      }
    }
  }

  public void getVersionsAndRender() {
    final RetrofitHelper retrofitHelper = RetrofitHelper.getInstance(nodeSecret);
    RequestService requestService = retrofitHelper.getRetrofit().create(RequestService.class);

    ByteArrayInputStream shortData = new ByteArrayInputStream("abc".getBytes());
    requestService.getVersion(new NodeRequestBody<>("version", null, shortData)).enqueue(new Callback<Version>() {
      @Override
      public void onResponse(Call<Version> call, Response<Version> response) {
        String text = null;
        Version version = null;

        if (response.errorBody() == null) {
          version = response.body();
        } else {
          try {
            version = retrofitHelper.getGson().fromJson(response.errorBody().string(), Version.class);
          } catch (IOException e) {
            e.printStackTrace();
          }
        }

        if (version != null) {
          text = version.toString();
        }
        text += "\n\n" + (response.raw().receivedResponseAtMillis() - response.raw().sentRequestAtMillis()) + "ms";
        tvResult.setText(text);
      }

      @Override
      public void onFailure(Call<Version> call, Throwable t) {
        tvResult.setText(t.getMessage());
      }
    });
  }

  public void runAllTestsAndRender() {
    resultText = "";
    final long startTime = System.currentTimeMillis();
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          final RetrofitHelper retrofitHelper = RetrofitHelper.getInstance(nodeSecret);
          RequestService requestService = retrofitHelper.getRetrofit().create(RequestService.class);

          hasTestFailure = false;
          byte[] testMsgBytes = testMsg.getBytes();
          String encryptedMsg = encryptMsgAndRender("encrypt-msg", testMsgBytes, requestService);
          decryptMsgAndRender("decrypt-msg-ecc", encryptedMsg.getBytes(), testData.eccPrvKeyInfo(), requestService);
          decryptMsgAndRender("decrypt-msg-rsa2048", encryptedMsg.getBytes(), testData.rsa2048PrvKeyInfo(), requestService);
          decryptMsgAndRender("decrypt-msg-rsa4096", encryptedMsg.getBytes(), testData.rsa4096PrvKeyInfo(), requestService);
          /*byte[] encryptedFileBytes = encryptFileAndRender("encrypt-file", testMsgBytes);
          decryptFileAndRender("decrypt-file-ecc", encryptedFileBytes, testData.eccPrvKeyInfo(), testMsgBytes);
          decryptFileAndRender("decrypt-file-rsa2048", encryptedFileBytes, testData.rsa2048PrvKeyInfo(), testMsgBytes);
          decryptFileAndRender("decrypt-file-rsa4096", encryptedFileBytes, testData.rsa4096PrvKeyInfo(), testMsgBytes);
          for (int mb : new int[]{1, 3, 5}) {
            byte[] payload = testData.payload(mb);
            byte[] bytes = encryptFileAndRender("encrypt-file-" + mb + "m" + "-rsa2048", payload);
            decryptFileAndRender("decrypt-file-" + mb + "m" + "-rsa2048", bytes, testData.rsa2048PrvKeyInfo(), payload);
          }*/
          if (!hasTestFailure) {
            addResultLine("all-tests", System.currentTimeMillis() - startTime, "success", true);
          } else {
            addResultLine("all-tests", System.currentTimeMillis() - startTime, "hasTestFailure", true);
          }
        } catch (Exception e) {
          addResultLine("all-tests", System.currentTimeMillis() - startTime, e, true);
        }
      }
    });
    t.setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
      public void uncaughtException(Thread th, Throwable e) {
        addResultLine("all-tests", System.currentTimeMillis() - startTime, e, true);
      }
    });
    t.start();
  }

  /**
   * this is just an example. Production app should use encrypted store
   */
  public void nodeSecretCertsCacheSave(NodeSecretCerts nodeSecretCerts) {
    try {
      FileOutputStream fos = getApplicationContext().openFileOutput(nodeSecretsCacheFilename, Context.MODE_PRIVATE);
      ObjectOutputStream oos = new ObjectOutputStream(fos);
      oos.writeObject(nodeSecretCerts);
      oos.close();
      fos.close();
    } catch (Exception e) {
      throw new RuntimeException("Could not save certs cache", e);
    }
  }

  /**
   * this is just an example. Production app should use encrypted store
   */
  public NodeSecretCerts nodeSecretCertsCacheLoad() {
    try {
      FileInputStream fis = getApplicationContext().openFileInput(nodeSecretsCacheFilename);
      ObjectInputStream ois = new ObjectInputStream(fis);
      return (NodeSecretCerts) ois.readObject();
    } catch (FileNotFoundException e) {
      return null;
    } catch (Exception e) {
      throw new RuntimeException("Could not load certs cache", e);
    }
  }

}
