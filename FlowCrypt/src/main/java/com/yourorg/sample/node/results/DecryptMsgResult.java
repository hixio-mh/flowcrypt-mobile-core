package com.yourorg.sample.node.results;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;

public class DecryptMsgResult extends DecryptResult {

  private MsgBlockMeta[] msgBlockMetas = null;

  public DecryptMsgResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

  public MsgBlockMeta[] getAllBlockMetas() {
    throwIfDecryptErrNotTested();
    if(msgBlockMetas == null) {
      try {
        JSONArray jsonBms = jsonResponseParsed.getJSONArray("blockMetas");
        MsgBlockMeta[] bm = new MsgBlockMeta[jsonBms.length()];
        for(int i = 0; i < jsonBms.length(); i++) {
          JSONObject jsonBm = jsonBms.getJSONObject(i);
          bm[i] = new MsgBlockMeta(jsonBm.getString("type"), jsonBm.getLong("length"));
        }
        msgBlockMetas = bm;
      } catch (JSONException | NullPointerException e) {
        msgBlockMetas = new MsgBlockMeta[0];
      }
    }
    return msgBlockMetas;
  }

  public MsgBlock getNextBlock() {
    throwIfDecryptErrNotTested();
    BufferedReader br = getDataTextBufferedReader();
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
