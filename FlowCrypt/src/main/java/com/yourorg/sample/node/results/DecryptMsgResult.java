package com.yourorg.sample.node.results;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;

class MsgBlockMeta {
  public final long length;
  public final String type;

  MsgBlockMeta(String type, long length) {
    this.type = type;
    this.length = length;
  }
}

class MsgBlock {

  //  type KeyDetails$ids = {
  //      longid: string;
  //    fingerprint: string;
  //    keywords: string;
  //    };
  //    export interface KeyDetails {
  //  private?: string;
  //  public: string;
  //  ids: KeyDetails$ids[];
  //  users: string[];
  //}
  // AttMeta: { name: att.name }

  public static final String TYPE_TEXT = "text";
  public static final String TYPE_PGP_MESSAGE = "message";
  public static final String TYPE_PGP_PUBLIC_KEY = "public_key";
  public static final String TYPE_PGP_SIGNED_MESSAGE = "signed_message";
  public static final String TYPE_PGP_PASSWORD_MESSAGE = "password_message";
  public static final String TYPE_ATTEST_PACKET = "attest_packet";
  public static final String TYPE_VERIFICATION = "cryptup_verification";
  public static final String TYPE_PGP_PRIVATE_KEY = "private_key";
  public static final String TYPE_ATTACHMENT = "attachment";
  public static final String TYPE_HTML = "html";

  private String type;
  private String content;

  public MsgBlock(String type, String content) { // todo: add keyDetails, attMeta
    this.type = type;
    this.content = content;
  }

  public String getType() {
    return type;
  }

  public String getContent() {
    return content;
  }

}

public class DecryptMsgResult extends DecryptResult {

  public DecryptMsgResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

  public MsgBlockMeta[] getAllBlockMetas() {
    throwIfDecryptErrNotTested();
    try {
      JSONArray jsonBms = jsonResponseParsed.getJSONArray("blockMetas");
      MsgBlockMeta[] bm = new MsgBlockMeta[jsonBms.length()];
      for(int i = 0; i < jsonBms.length(); i++) {
        JSONObject jsonBm = jsonBms.getJSONObject(i);
        bm[i] = new MsgBlockMeta(jsonBm.getString("type"), jsonBm.getLong("length"));
      }
      return bm;
    } catch (JSONException | NullPointerException e) {
      return new MsgBlockMeta[0];
    }
  }

  public MsgBlock getNextBlock() {
    throwIfDecryptErrNotTested();
    BufferedReader br = getDataBufferedReader();
    try {
      String rawBlockJson = br.readLine();
      if(rawBlockJson == null || rawBlockJson.isEmpty()) {
        return null;
      }
      JSONObject jsonBlock = new JSONObject(rawBlockJson);
      return new MsgBlock(jsonBlock.getString("type"), jsonBlock.getString("content"));
    } catch (JSONException | NullPointerException | IOException e) {
      try {
        br.close(); // is this needed?
      } catch (IOException brCloseErr) {
        brCloseErr.printStackTrace();
      }
      return null;
    }
  }

}
