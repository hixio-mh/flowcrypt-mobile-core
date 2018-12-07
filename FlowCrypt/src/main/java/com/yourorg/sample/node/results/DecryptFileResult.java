package com.yourorg.sample.node.results;

import org.json.JSONException;

import java.io.BufferedReader;
import java.io.InputStream;

/**
 * json: { success: true, name: decryptedMeta.content.filename || '' }
 * data: raw decrypted bytes
 */
public class DecryptFileResult extends DecryptResult {

  public DecryptFileResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

  public String getDecryptedDataString() {
    throwIfDecryptErrNotTested();
    return getDataString();
  }

  public BufferedReader getDecryptedDataBufferedReader() {
    throwIfDecryptErrNotTested();
    return getDataBufferedReader();
  }

  public String getName() {
    throwIfDecryptErrNotTested();
    try {
      return jsonResponseParsed.getString("name");
    } catch (JSONException | NullPointerException e) {
      return "";
    }
  }

}
