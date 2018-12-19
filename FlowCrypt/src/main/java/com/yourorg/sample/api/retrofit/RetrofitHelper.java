/*
 * © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com
 * Contributors: DenBond7
 */

package com.yourorg.sample.api.retrofit;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.yourorg.sample.node.NodeSecret;

import java.io.IOException;
import java.security.cert.X509Certificate;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLSession;

import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;


/**
 * @author DenBond7
 */
public final class RetrofitHelper {
  private static final int TIMEOUT = 30;
  private OkHttpClient okHttpClient;
  private Retrofit retrofit;
  private Gson gson;

  private RetrofitHelper(final NodeSecret nodeSecret) {
    OkHttpClient.Builder okHttpClientBuilder = new OkHttpClient.Builder()
        .connectTimeout(TIMEOUT, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT, TimeUnit.SECONDS);

    okHttpClientBuilder.addInterceptor(headersInterceptor(nodeSecret));
    HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
    loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
    okHttpClientBuilder.addInterceptor(loggingInterceptor);
    okHttpClientBuilder.sslSocketFactory(nodeSecret.getSslSocketFactory(), nodeSecret.getSslTrustManager());
    okHttpClientBuilder.followRedirects(false);
    okHttpClientBuilder.followSslRedirects(false);
    okHttpClientBuilder.hostnameVerifier(trustOurOwnCrtHostnameVerifier(nodeSecret));

    okHttpClient = okHttpClientBuilder.build();

    gson = new GsonBuilder()
        .excludeFieldsWithoutExposeAnnotation()
        .serializeNulls()
        .create();

    Retrofit.Builder retrofitBuilder = new Retrofit.Builder()
        .baseUrl("https://localhost:" + nodeSecret.port + "/")
        .addConverterFactory(GsonConverterFactory.create(gson))
        .client(okHttpClient);

    retrofit = retrofitBuilder.build();
  }

  private Interceptor headersInterceptor(final NodeSecret nodeSecret) {
    return new Interceptor() {
      @Override
      public okhttp3.Response intercept(Chain chain) throws IOException {
        okhttp3.Request request = chain.request();
        Headers headers = request
            .headers()
            .newBuilder()
            .add("Authorization", nodeSecret.authHeader)
            .add("Connection", "Keep-Alive")
            .build();
        request = request.newBuilder().headers(headers).build();
        return chain.proceed(request);
      }
    };
  }

  private HostnameVerifier trustOurOwnCrtHostnameVerifier(final NodeSecret nodeSecret) {
    return new HostnameVerifier() {
      @Override
      public boolean verify(String host, SSLSession session) {
        try {
          X509Certificate crt = (X509Certificate) session.getPeerCertificates()[0];
          if(!"localhost".equals(host) || !"CN=localhost".equals(crt.getSubjectDN().getName())) {
            return false;
          }
          return crt.getSerialNumber().equals(nodeSecret.getSslCrtSerialNumber());
        } catch (Exception e) {
          return false;
        }
      }
    };
  }

  public static RetrofitHelper getInstance(NodeSecret nodeSecret) {
    return new RetrofitHelper(nodeSecret);
  }

  public OkHttpClient getOkHttpClient() {
    return okHttpClient;
  }

  public Retrofit getRetrofit() {
    return retrofit;
  }

  public Gson getGson() {
    return gson;
  }
}
