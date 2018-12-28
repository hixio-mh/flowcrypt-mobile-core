package com.yourorg.sample.ui.activity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.support.annotation.Nullable;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.TextView;

import com.yourorg.sample.R;
import com.yourorg.sample.TestData;
import com.yourorg.sample.api.retrofit.NodeRequestBody;
import com.yourorg.sample.api.retrofit.RequestService;
import com.yourorg.sample.api.retrofit.RetrofitHelper;
import com.yourorg.sample.api.retrofit.request.model.DecryptModel;
import com.yourorg.sample.api.retrofit.request.model.FileModel;
import com.yourorg.sample.api.retrofit.request.model.Pubkeys;
import com.yourorg.sample.api.retrofit.response.models.Version;
import com.yourorg.sample.node.Node;
import com.yourorg.sample.node.NodeSecretCerts;
import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptFileResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.MsgBlock;
import com.yourorg.sample.node.results.PgpKeyInfo;
import com.yourorg.sample.node.results.RawNodeResult;

import org.apache.commons.io.IOUtils;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.util.Arrays;

import okhttp3.RequestBody;
import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {
  private static final int REQUEST_CODE_CHOOSE_FILE = 10;

  private final String nodeSecretsCacheFilename = "flowcrypt-node-secrets-cache";
  private final String testMsg = "this is ~\na test for\n\ndecrypting\nunicode:\u03A3\nthat's all";
  private final String testMsgHtml = "this is ~<br>a test for<br><br>decrypting<br>unicode:\u03A3<br>that&#39;s all";

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
  private Node node;

  public MainActivity() {
    node = Node.getInstance();
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
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
    findViewById(R.id.btnChooseFile).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        chooseFile();
      }
    });
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
    super.onActivityResult(requestCode, resultCode, data);

    switch (requestCode) {
      case REQUEST_CODE_CHOOSE_FILE:
        switch (resultCode) {
          case Activity.RESULT_OK:
            encryptDecryptFile(data.getData());
            break;
        }

    }
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
    RequestBody requestBody = new NodeRequestBody<>("encryptMsg", new Pubkeys(TestData.getMixedPubKeys()), data);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    EncryptMsgResult encryptMsgResult = new EncryptMsgResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
    addResultLine(actionName, encryptMsgResult);
    return encryptMsgResult.getEncryptedString();
  }

  private byte[] encryptFileAndRender(String actionName, byte[] data, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("encryptFile", new FileModel(TestData.getMixedPubKeys(), "file.txt"), data);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    EncryptFileResult r = new EncryptFileResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
    addResultLine(actionName, r);
    return r.getEncryptedDataBytes();
  }

  private byte[] encryptFileAndRender(String actionName, Uri uri, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>(this.getApplicationContext(), "encryptFile", new FileModel(TestData.getMixedPubKeys(), "file.txt"), uri);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    EncryptFileResult r = new EncryptFileResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
    addResultLine(actionName, r);
    return r.getEncryptedDataBytes();
  }

  private void decryptFileAndRender(String actionName, byte[] encryptedData, PgpKeyInfo[] prvKeys, byte[] originalData, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("decryptFile", new DecryptModel(prvKeys, TestData.passphrases(), null), encryptedData);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    DecryptFileResult r = new DecryptFileResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
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

  private void decryptFileAndRender(String actionName, File file, PgpKeyInfo[] prvKeys, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("decryptFile", new DecryptModel(prvKeys, TestData.passphrases(), null), file);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    DecryptFileResult r = new DecryptFileResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());
    if (r.getErr() != null) {
      addResultLine(actionName, r.ms, r.getErr(), false);
    } else if (r.getDecryptErr() != null) {
      addResultLine(actionName, r.ms, r.getDecryptErr().type + ":" + r.getDecryptErr().error, false);
    } else if (!"file.txt".equals(r.getName())) {
      addResultLine(actionName, r.ms, "wrong filename", false);
    } else {
      addResultLine(actionName, r);
    }
  }

  private void decryptMsgAndRender(String actionName, byte[] data, PgpKeyInfo[] prvKeys, RequestService requestService) throws IOException {
    RequestBody requestBody = new NodeRequestBody<>("decryptMsg", new DecryptModel(prvKeys, TestData.passphrases(), null), data);
    Response<ResponseBody> responseBody = requestService.request(requestBody).execute();
    DecryptMsgResult r = new DecryptMsgResult(null, responseBody.body().byteStream(), responseBody.raw().receivedResponseAtMillis() - responseBody.raw().sentRequestAtMillis());

//    DecryptMsgResult r = Node.decryptMsg(data, prvKeys, TestData.passphrases(), null);
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

  private void getVersionsAndRender() {
    final RetrofitHelper retrofitHelper = RetrofitHelper.getInstance(node.getNodeSecret());
    RequestService requestService = retrofitHelper.getRetrofit().create(RequestService.class);

    requestService.getVersion(new NodeRequestBody<>("version", null, "abc".getBytes())).enqueue(new Callback<Version>() {
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

  private void runAllTestsAndRender() {
    resultText = "";
    final long startTime = System.currentTimeMillis();
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          final RetrofitHelper retrofitHelper = RetrofitHelper.getInstance(node.getNodeSecret());
          RequestService requestService = retrofitHelper.getRetrofit().create(RequestService.class);

          hasTestFailure = false;
          byte[] testMsgBytes = testMsg.getBytes();
          String encryptedMsg = encryptMsgAndRender("encrypt-msg", testMsgBytes, requestService);
          decryptMsgAndRender("decrypt-msg-ecc", encryptedMsg.getBytes(), TestData.eccPrvKeyInfo(), requestService);
          decryptMsgAndRender("decrypt-msg-rsa2048", encryptedMsg.getBytes(), TestData.rsa2048PrvKeyInfo(), requestService);
          decryptMsgAndRender("decrypt-msg-rsa4096", encryptedMsg.getBytes(), TestData.rsa4096PrvKeyInfo(), requestService);
          byte[] encryptedFileBytes = encryptFileAndRender("encrypt-file", testMsgBytes, requestService);
          decryptFileAndRender("decrypt-file-ecc", encryptedFileBytes, TestData.eccPrvKeyInfo(), testMsgBytes, requestService);
          decryptFileAndRender("decrypt-file-rsa2048", encryptedFileBytes, TestData.rsa2048PrvKeyInfo(), testMsgBytes, requestService);
          decryptFileAndRender("decrypt-file-rsa4096", encryptedFileBytes, TestData.rsa4096PrvKeyInfo(), testMsgBytes, requestService);
          for (int mb : new int[]{1, 3, 5}) {
            byte[] payload = TestData.payload(mb);
            byte[] bytes = encryptFileAndRender("encrypt-file-" + mb + "m" + "-rsa2048", payload, requestService);
            decryptFileAndRender("decrypt-file-" + mb + "m" + "-rsa2048", bytes, TestData.rsa2048PrvKeyInfo(), payload, requestService);
          }
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
  private void nodeSecretCertsCacheSave(NodeSecretCerts nodeSecretCerts) {
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
  private NodeSecretCerts nodeSecretCertsCacheLoad() {
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

  private void chooseFile() {
    Intent intent = new Intent();
    intent.setAction(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("*/*");
    startActivityForResult(Intent.createChooser(intent, getString(R.string.choose_file)), REQUEST_CODE_CHOOSE_FILE);
  }

  private void encryptDecryptFile(final Uri data) {
    resultText = "";
    final long startTime = System.currentTimeMillis();
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          final RetrofitHelper retrofitHelper = RetrofitHelper.getInstance(node.getNodeSecret());
          RequestService requestService = retrofitHelper.getRetrofit().create(RequestService.class);

          hasTestFailure = false;
          byte[] encryptedFileBytes = encryptFileAndRender("encrypt-file", data, requestService);

          File temp = File.createTempFile("prefix", "suffix", getCacheDir());
          try (InputStream inputStream = new ByteArrayInputStream(encryptedFileBytes);
               OutputStream outputStream = new FileOutputStream(temp)) {
            IOUtils.copy(inputStream, outputStream);
          }

          decryptFileAndRender("decrypt-file-ecc", temp, TestData.eccPrvKeyInfo(), requestService);
          decryptFileAndRender("decrypt-file-rsa2048", temp, TestData.rsa2048PrvKeyInfo(), requestService);
          decryptFileAndRender("decrypt-file-rsa4096", temp, TestData.rsa4096PrvKeyInfo(), requestService);

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

}
