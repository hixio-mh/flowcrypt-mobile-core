package com.yourorg.sample.node.results;

import java.io.InputStream;

public class EncryptMsgResult extends EncryptResult {

  public EncryptMsgResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

}
