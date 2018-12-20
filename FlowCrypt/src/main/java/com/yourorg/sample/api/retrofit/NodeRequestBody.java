package com.yourorg.sample.api.retrofit;

import com.google.gson.GsonBuilder;

import org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.BufferedSink;

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
    this.inputStream = inputStream;
  }

  @Override
  public MediaType contentType() {
    return null;
  }

  @Override
  public void writeTo(BufferedSink sink) throws IOException {
    sink.writeUtf8(endpoint);
    sink.writeUtf8("\n");
    if (request == null) {
      sink.writeUtf8("{}");
    } else {
      sink.writeUtf8(new GsonBuilder().create().toJson(request));
    }
    sink.writeUtf8("\n");
    if (inputStream != null) {
      OutputStream outputStream = sink.outputStream();
      IOUtils.copy(inputStream, outputStream);
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
