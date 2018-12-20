package com.yourorg.sample.api.retrofit;

import com.google.gson.GsonBuilder;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okhttp3.internal.Util;
import okio.BufferedSink;
import okio.Okio;
import okio.Source;

/**
 * @author DenBond7
 */
public class NodeRequestBody<T> extends RequestBody {
  private String endpoint;
  private T request;
  private InputStream inputStream;

  public NodeRequestBody(String endpoint, T request, InputStream inputStream) {
    this.endpoint = endpoint;
    this.request = request;
    this.inputStream = new BufferedInputStream(inputStream);
  }

  public NodeRequestBody(String endpoint, T request, byte[] data) {
    this.endpoint = endpoint;
    this.request = request;
    this.inputStream = new BufferedInputStream(new ByteArrayInputStream(data));
  }

  @Override
  public MediaType contentType() {
    return null;
  }

  @Override
  public void writeTo(BufferedSink sink) throws IOException {
    sink.writeUtf8(endpoint);
    sink.writeByte('\n');
    if (request == null) {
      sink.writeUtf8("{}");
    } else {
      sink.writeUtf8(new GsonBuilder().create().toJson(request));
    }
    sink.writeByte('\n');
    if (inputStream != null) {
      Source source = null;
      try {
        source = Okio.source(new BufferedInputStream(inputStream));
        sink.writeAll(source);
      } finally {
        Util.closeQuietly(source);
      }
    }
  }

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public T getRequest() {
    return request;
  }

  public void setRequest(T request) {
    this.request = request;
  }

  public InputStream getInputStream() {
    return inputStream;
  }

  public void setInputStream(InputStream inputStream) {
    this.inputStream = inputStream;
  }
}
