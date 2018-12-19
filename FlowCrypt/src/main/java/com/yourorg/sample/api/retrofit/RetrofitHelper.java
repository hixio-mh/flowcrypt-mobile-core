/*
 * © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com
 * Contributors: DenBond7
 */

package com.yourorg.sample.api.retrofit;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.yourorg.sample.node.NodeSecret;

import java.io.IOException;
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

    Interceptor headerAuthorizationInterceptor = new Interceptor() {
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
    okHttpClientBuilder.addInterceptor(headerAuthorizationInterceptor);

    HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
    loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
    okHttpClientBuilder.addInterceptor(loggingInterceptor);

    try {
      //todo-denbond7 Need to look at sslSocketFactory deprecation
      okHttpClientBuilder.sslSocketFactory(nodeSecret.getSslSocketFactory());

      //todo-denbond7 Need to look at hostnameVerifier
      okHttpClientBuilder.hostnameVerifier(new HostnameVerifier() {
        @Override
        public boolean verify(String hostname, SSLSession session) {
          return true;
        }
      });
    } catch (Exception e) {
      e.printStackTrace();
    }

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
