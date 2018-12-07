package com.yourorg.sample.node.results;

import java.io.InputStream;

public class EncryptFileResult extends EncryptResult {

  public EncryptFileResult(Exception err, InputStream inputStream, long startTime) {
    super(err, inputStream, startTime);
  }

}
