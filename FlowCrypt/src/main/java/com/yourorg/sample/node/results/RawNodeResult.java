package com.yourorg.sample.node.results;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

public class RawNodeResult {
  /**
   * Responses from Node.js come formatted as a JSON before the first \n mark, and optional binary data afterwards
   * stripAndParseJsonLine() will strip the first JSON line off the rest when accessing data (if not already stripped)
   */


  private Exception err;
  private InputStream inputStream;
  private boolean errWasTested = false;
  protected boolean jsonResponseAlreadyStripped = false;
  protected String jsonResponseRaw;
  protected JSONObject jsonResponseParsed;
  private BufferedReader br;
  public long ms;

  public RawNodeResult(Exception err, InputStream inputStream, long ms) {
    this.err = err;
    this.inputStream = inputStream;
    this.ms = ms;
  }

  public <T> T convertTo(Class<T> cls) {
    try {
      Class[] argClasses = new Class[]{Exception.class, InputStream.class, long.class};
      return cls.getDeclaredConstructor(argClasses).newInstance(this.err, this.inputStream, this.ms);
    } catch(Exception e) {
      throw new RuntimeException("RawNodeResult wrong constructor definition", e);
    }
  }

  public Exception getErr() {
    errWasTested = true;
    stripAndParseJsonLine();
    return err;
  }

  protected void throwIfErrNotTested() {
    if(!errWasTested) {
      throw new Error("RawNodeResult getErr() must be called before accessing data");
    }
  }

  private InputStream getInputStream() {
    throwIfErrNotTested();
    return inputStream;
  }

  private BufferedReader getInputStreamBufferedReader() {
    throwIfErrNotTested();
    if(inputStream == null) {
      return null;
    }
    if(br == null) {
      br = new BufferedReader(new InputStreamReader(getInputStream()));
    }
    return br;
  }

  private void stripAndParseJsonLine() {
    throwIfErrNotTested();
    if(!jsonResponseAlreadyStripped) {
      jsonResponseAlreadyStripped = true;
      BufferedReader br = getInputStreamBufferedReader();
      if(br != null) {
        try {
          jsonResponseRaw = br.readLine();
          jsonResponseParsed = new JSONObject(jsonResponseRaw);
        } catch (IOException e) {
          jsonResponseRaw = "";
        } catch (JSONException e) {
          jsonResponseParsed = null;
        } catch (NullPointerException e) {
          jsonResponseRaw = "";
          jsonResponseParsed = null;
        }
      }
    }
  }

  protected String getDataString() {
    throwIfErrNotTested();
    BufferedReader br = getInputStreamBufferedReader();
    if(br == null) {
      return null;
    }
    return br.lines().collect(Collectors.joining("\n"));
  }

  protected BufferedReader getDataBufferedReader() {
    throwIfErrNotTested();
    return getInputStreamBufferedReader();
  }

}

abstract class EncryptResult extends RawNodeResult {

  EncryptResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

  public String getEncryptedDataString() {
    return getDataString();
  }

  public BufferedReader getEncryptedDataBufferedReader() {
    return getDataBufferedReader();
  }

}

/**
 * DecryptErrTypes: key_mismatch | use_password | wrong_password | no_mdc | need_passphrase | format | other
 * DecryptError$longids: { message: string[]; matching: string[]; chosen: string[]; needPassphrase: string[]; }
 * json: { success: false; error: { type: DecryptErrTypes; error?: string; }; longids: DecryptError$longids; isEncrypted?: boolean; }
 */
abstract class DecryptResult extends RawNodeResult {

  public String ERR_KEY_MISMATCH = "key_mismatch";
  public String ERR_USE_PASSWORD = "use_password";
  public String ERR_WRONG_PASSWORD = "wrong_password";
  public String ERR_NO_MDC = "no_mdc";
  public String ERR_NEED_PASSPHRASE = "need_passphrase";
  public String ERR_FORMAT = "format";
  public String ERR_OTHER = "other";
  public String ERR_BAD_RESPONSE = "bad_response"; // this is only defined in Java when we get unexpected data from Node

  protected boolean decryptErrTested = false;

  DecryptResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

  public DecryptErr getDecryptErr() {
    throwIfErrNotTested();
    decryptErrTested = true;
    try {
      if(jsonResponseParsed.getBoolean("success")) {
        return null;
      }
      JSONObject error = jsonResponseParsed.getJSONObject("error");
      return new DecryptErr(error.getString("type"), error.has("error") ? error.getString("error") : "");
    } catch (JSONException | NullPointerException e) {
      return new DecryptErr(this.ERR_BAD_RESPONSE, "DecryptResult.getDecryptErr exception: " + e.getMessage());
    }
  }

  protected void throwIfDecryptErrNotTested() {
    if(!decryptErrTested) {
      throw new Error("DecryptResult getDecryptErr() must be called before accessing data");
    }
  }

}
