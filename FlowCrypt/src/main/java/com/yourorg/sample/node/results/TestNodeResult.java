package com.yourorg.sample.node.results;

import java.io.InputStream;

public class TestNodeResult extends RawNodeResult {

  public TestNodeResult(Exception err, InputStream inputStream, long ms) {
    super(err, inputStream, ms);
  }

  public String getRawJsonResponse() {
    throwIfErrNotTested();
    return jsonResponseRaw;
  }
}
