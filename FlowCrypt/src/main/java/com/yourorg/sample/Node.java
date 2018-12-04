package com.yourorg.sample;

import android.content.res.AssetManager;

import org.apache.commons.io.IOUtils;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.util.stream.Collectors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;

public class Node {

  public static void start(AssetManager am) {
    NativeNodeWrapper.startIfNotRunning(am);
  }

  public static String request(String endpoint) {
    try {
      URL url = new URL("https://localhost:3000/" + endpoint);
      HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
      conn.setSSLSocketFactory(NativeNodeWrapper.getCustomCaTlsSocketFactory());
      return new BufferedReader(new InputStreamReader(conn.getInputStream())).lines().collect(Collectors.joining());
    } catch (Exception ex) {
      return ex.toString();
    }
  }

}

class NativeNodeWrapper {

  static { // Used to load the 'native-lib' library on application startup.s
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  public static String SSL_CA = "-----BEGIN CERTIFICATE-----\n" +
      "MIIF2jCCA8KgAwIBAgIJAPlUAZVi0YciMA0GCSqGSIb3DQEBCwUAMIGBMQswCQYD\n" +
      "VQQGEwJISzESMBAGA1UECAwJSG9uZyBLb25nMRIwEAYDVQQHDAlIb25nIEtvbmcx\n" +
      "GjAYBgNVBAoMEUZsb3dDcnlwdCBMaW1pdGVkMRYwFAYDVQQLDA1ub2RlanMtbW9i\n" +
      "aWxlMRYwFAYDVQQDDA1ub2RlanMtbW9iaWxlMB4XDTE4MTIwNDE3MjUzMFoXDTQ2\n" +
      "MDQyMTE3MjUzMFowgYExCzAJBgNVBAYTAkhLMRIwEAYDVQQIDAlIb25nIEtvbmcx\n" +
      "EjAQBgNVBAcMCUhvbmcgS29uZzEaMBgGA1UECgwRRmxvd0NyeXB0IExpbWl0ZWQx\n" +
      "FjAUBgNVBAsMDW5vZGVqcy1tb2JpbGUxFjAUBgNVBAMMDW5vZGVqcy1tb2JpbGUw\n" +
      "ggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDE+pU5cCe8mzm6uMrs1GI5\n" +
      "ze98lLrTXht8+VmFbE1don+Hz4Sw6iZ31JwSai1+CpsCWwoCM3C8WRHnOkgjDm3l\n" +
      "gZQJsOS+9e9uHHrhLfNwd2/uVKja/uU81atpcNoNQ1C74Utx0ance/W2DbHTN/jb\n" +
      "Z3c42fhjs/7f6GyKnNALsC8mod1XkRPJQRuYwMqNTchwOHUMCzIUgUGbPuXfOnpQ\n" +
      "Ig7b99I5fzPkQ8Y5dmy6zmTrtCwuE8NmGs7XbmsNqWuyayTnXosGuZ4ZZSWOkHdO\n" +
      "Lcf8mMTUuHolCXlNejMl3LN36qWonMgEYO+jmuimpNx1qPHUaaxP1jI8bNVnOcUm\n" +
      "B2blJQ0WKyhrTpnZy7sv6oiHdbE26HWLHm4db3XB1J/meIKyVJSopt+HnshtoC6E\n" +
      "Ldg6to+mOWVHw+W1/WWfoev12tloVTWsUCDCA5DMYXXUGgf80hYlrQGQkzjZTIth\n" +
      "uofL9IfgWD7s4SQ1tmOp8PbdmFNnely7vEEqekVlXHC7HSnCa4pF+VUu/fX5SOsC\n" +
      "NrLvKpFO4YbKdIj2t8PBe+USpmtV/4mm1h7MQF3b/Qc3Chy1UlzHlVG7KEJv8qID\n" +
      "ZGY2/zHtWkRC5OynOaKfY25lV2wZiTzTYM/N8nOA5c6HwojW43K7csKTXg6vPBuY\n" +
      "6Cu5Azfn5wxKlAvXbEadIQIDAQABo1MwUTAdBgNVHQ4EFgQUiAY4wQecjkZ19eLn\n" +
      "ZFwziXxQWNswHwYDVR0jBBgwFoAUiAY4wQecjkZ19eLnZFwziXxQWNswDwYDVR0T\n" +
      "AQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAgEAJQZFeMOF5NXPD7QBHLQSzj0C\n" +
      "Zr7fSI72qFUbHKur5jFQR8vxepFBOGOGATvcqPQR90CUbKTfQssY/JrvY+TjysAR\n" +
      "dm9KjWdb0Ps0VzHt4MbpEdk0zCYBBugIubtHkYjsW1aU4KHDU4bES2oqn821eegI\n" +
      "AJdnYnWsCq0bcwQysrHnvFajeUSr9eBTR6baPCXyQqaR+h9ZXWI8LL9T6qD4sBSS\n" +
      "nkOcUMpPuZAqA8jdECfPU4JSevvxSOpRR7LQiI63vUyYQIzZ6hmFcyKrqjUg8rnk\n" +
      "MPtJ84ympSD4hNzXie1U319H6CqWYL5XuaW1lvQuLisabEyw2sJ5E5MuuyUxRw0w\n" +
      "tSZ7fj22t0SXnKpoZOOn+fNw+YzpQWxek1iLkJKDnsqQrDPB2bCbntkKWdx6jtPg\n" +
      "n5yTTeoZ9j4JbRT3A1K5YivujTWuJLbRLz1qSyMuPWN+SXLNenPeQOjg4iVnEPoN\n" +
      "sRmjx7K9RZbEDR1V9bpn4wNSuKprVVmD1WIPZvm/MwpfagtdY+/tZTiekn8GDElF\n" +
      "oGfaJM32xBH9cqLFTjEm6yucTk+V7WrkNJOBoA+xJNGDKNE7i/udTZHWpQotLKzO\n" +
      "g8px0Y5y4ssGljVvmpgkUVUjuDY1SCMNCSmLcVQ7D6a8M1o+ez2EJKdMfRxwQAkl\n" +
      "pUZ5Y50QBatTK7U+oU0=\n" +
      "-----END CERTIFICATE-----\n";

  private static String DEBUG_SSL_CRT = "-----BEGIN CERTIFICATE-----\n" +
      "MIIESDCCAjACCQDJbepQvI1QejANBgkqhkiG9w0BAQsFADCBgTELMAkGA1UEBhMC\n" +
      "SEsxEjAQBgNVBAgMCUhvbmcgS29uZzESMBAGA1UEBwwJSG9uZyBLb25nMRowGAYD\n" +
      "VQQKDBFGbG93Q3J5cHQgTGltaXRlZDEWMBQGA1UECwwNbm9kZWpzLW1vYmlsZTEW\n" +
      "MBQGA1UEAwwNbm9kZWpzLW1vYmlsZTAeFw0xODEyMDQxNzM0MzZaFw00NjA0MjEx\n" +
      "NzM0MzZaMEoxCzAJBgNVBAYTAkhLMQswCQYDVQQIDAJISzEaMBgGA1UECgwRRmxv\n" +
      "d0NyeXB0IExpbWl0ZWQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcN\n" +
      "AQEBBQADggEPADCCAQoCggEBAOoWXvlg4GfT3Dk5fYGf/OkIHRdU+ZrlYQbYIFRL\n" +
      "HZot6p7P0ZY2lVmM5Oj6ZZ5khXlWMyvV7k2NAzJhFqj0d6ppIeYuPp63Tjo6IILW\n" +
      "rmRVv5xojB9r9EfCJmxw1NRllqW779r/xiRb2YT8Bpoz1GhBY4vVCkLO3bQVpc7i\n" +
      "Jcrxl/8enuhhabwkmN3ZbZSCFtb2aGcI5zYr+YPMQHTrzm3MTyiL6gZo4yQ9obVf\n" +
      "XO1GMXqINT67vJJmQGB7JDLs8X3/buA4MA4LegVvL7eCMtUfbwQwTVbp6n8MvlBW\n" +
      "uKAzz2QzYquEKfokxgBwIE9mltZUdWo9gzvKBuNfIj4NiW0CAwEAATANBgkqhkiG\n" +
      "9w0BAQsFAAOCAgEAwIPGqTx82S4F8dvp0mXBy4myquod/zV32yAiqe2QuTHp7HqX\n" +
      "zk6RNm2cJlTMTo0AeHCExsEYVBadBkOdp0b5Pj3GT0YgWWTxmGoOBPX2d5HZTZmA\n" +
      "t+Kh5Q1DlTASVX4Megd51+ITQuSqje5KJfSSJjCxlu5jIlOq15l0CFzf4tHeqeXw\n" +
      "7P1XASQuNEdaOASCjA5kaOs28n9GqShtXxpIwoArom4WXVJgKXzUOyNLIyGLbest\n" +
      "vaVtqubiNapDP8JmN3qchRpO7e6ASQ+IFNVYToRlxHXwHXi1pOZsWZ8UR85+/YOv\n" +
      "itq+j0DW/0R7l/vMrgNCCbyxgAKiNr9YnXBqVsgrG+K0nCokj02MPo4wP2c7l+8E\n" +
      "IHw4jfGnb++EX1sWlEBbbK6vE1xJORszNNwZI1X4OqkDosaBP26asCBmdlCPgVwu\n" +
      "oMuPzkmMnWCPFxh5wBslzTtgL2sPoWRNtN06HdGC8yYffqGetWOITiIshRJsfH8K\n" +
      "mylCHHG8NIpc9j6ITkuwEyEIKs1hn/yyfSVJ13grxNoEPFgYKS6uJwi53VhLj/Es\n" +
      "SXb9PSc3EBdUPrjt5zpZ+GqPbzD4HmLXkpHRyyGDK3hq7BLbAe8N/EwkOaIBVm+j\n" +
      "Fi94H/5KdbTDeNoYUo3u5arrnm+V0fbqApT6NMY/8ad+AyhCc3FLzSyDZeg=\n" +
      "-----END CERTIFICATE-----\n";

  private static String DEBUG_SSL_KEY = "-----BEGIN RSA PRIVATE KEY-----\n" +
      "MIIEowIBAAKCAQEA6hZe+WDgZ9PcOTl9gZ/86QgdF1T5muVhBtggVEsdmi3qns/R\n" +
      "ljaVWYzk6PplnmSFeVYzK9XuTY0DMmEWqPR3qmkh5i4+nrdOOjoggtauZFW/nGiM\n" +
      "H2v0R8ImbHDU1GWWpbvv2v/GJFvZhPwGmjPUaEFji9UKQs7dtBWlzuIlyvGX/x6e\n" +
      "6GFpvCSY3dltlIIW1vZoZwjnNiv5g8xAdOvObcxPKIvqBmjjJD2htV9c7UYxeog1\n" +
      "Pru8kmZAYHskMuzxff9u4DgwDgt6BW8vt4Iy1R9vBDBNVunqfwy+UFa4oDPPZDNi\n" +
      "q4Qp+iTGAHAgT2aW1lR1aj2DO8oG418iPg2JbQIDAQABAoIBAGvjJaCwGp0f0ub4\n" +
      "7TRaBVltqOLBAk12nJJn9/aBrEIMGY9aXtFplMnyGuqZxU4MLEwxA2KXtb4+WJPW\n" +
      "lXgHPEPpMnuBItFJ0J8bfTJwOW3661XuBW7R9YNBIy5ljmHZ9GWsSa7YpXzKbGVT\n" +
      "NsPJUYM/Z97hsFn8N8gxFftU1XBDqSYdNW3ouufBsfW5FyGDfOXEi++MJBy6W+kR\n" +
      "aG5P66Kp+zketjnAvWKPGoGijQpv4w6BkAM2+MlrKJPtQ2GQyFkX/r0PFXIUMh2K\n" +
      "O4pq8vAmUtOv2O484V5gMBA35pPuY7S/PZLADtc250OzsT7/BKbRm8/XYNY26Ffk\n" +
      "Ssrpi0ECgYEA/lj6CM0wND1izKFJMLYWApyXCtKqSjuZE0KoIjveddjOIRwmulGt\n" +
      "ZtjIHFdOVac1jleeCltQo9hu1LeCLW/6f1LEtv1zRiznU6+EaWM+hgQw84lc0YaV\n" +
      "PAUEVZMiTojfqfW1R87Itlorqdgt6BOfZzqsiSkSVzub2HDS+TQ5UT0CgYEA65uy\n" +
      "u0DDLJeCNYpEAKvaQ7JYxjDb6qpkct/+PuO1zcrFzWcBqkGv9TGuYco0MhdzZ9Sf\n" +
      "PY2YrWhKEqaGQ3LT2bbO4OXdPgN4Pb84oRUpJNxyi+eyE6id2D3LGCA9hMxwr59E\n" +
      "4nmxDkgyAofry9gSLfCT0oLKzPX4PTjIOm/LO/ECgYEA5vzrZh7iji7JkUlQbNqQ\n" +
      "tqJ7UarsWCoz5Jf+lciFScUxvkQQr9kJf4OUiJiJXaRTMQhFUOaJH6OpU6msoZM2\n" +
      "jXcfi4g1rh+NniSiPguRdqhLxICVOPvef/mWbBkJaQVJCtNIZQRYp7LQQJlBZ6ia\n" +
      "dWeF1bLlIy/RYwljsEpLW4kCgYA6Oawd4o9ZQcgH+zd7Av1ZpYWS1RhEEf/o87od\n" +
      "SKDxTp87d61NqhYV/kUeHZ5wkqMOkdkYmRmWISPNICImIQaB00+k/KmEXc8lU1Bn\n" +
      "XpdgaKpWMNgtS4pWmk7Kk40geHWQsUeQwIolAWp6faSkJ622dLHTYEdGB7NlTdcN\n" +
      "ufr7wQKBgE5QemjuKR5UThKfJxCit3GG78x9w34sstNnFdxDLHc6BOIwpCLaJVJ4\n" +
      "ddxgWW61TRBBsmYYg4uvRvTneifWnslhcSDkC8qMxF+Uy1Zind7VaIPmrEuO94ga\n" +
      "4OwmkzvpbDYc9fnryAxW6oF1m58PQF5uGADObctj07YiFzB6zj4G\n" +
      "-----END RSA PRIVATE KEY-----\n";

  private static boolean isRunning = false;
  private static SSLContext sslContext = null;

  static SSLSocketFactory getCustomCaTlsSocketFactory() throws CertificateException, KeyStoreException, NoSuchAlgorithmException, IOException, KeyManagementException {
    if(sslContext == null) {
      CertificateFactory cf = CertificateFactory.getInstance("X.509");
      Certificate ca = cf.generateCertificate(new ByteArrayInputStream(SSL_CA.getBytes()));
      KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
      keyStore.load(null, null);
      keyStore.setCertificateEntry("ca", ca);
      TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
      tmf.init(keyStore);
      sslContext = SSLContext.getInstance("TLS");
      sslContext.init(null, tmf.getTrustManagers(), null);
    }
    return sslContext.getSocketFactory();
  }

  static void startIfNotRunning(final AssetManager am) {
    if(!isRunning) {
      isRunning = true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          new NativeNodeWrapper().start(am);
          isRunning = false; // if it ever stops running, set isRunning back to false
        }
      }).start();
    }
  }

  private void start(AssetManager am) {
    startNodeWithArguments(new String[]{"node", "-e", getJavaScriptSource(am)});
  }

  private static String jsInitConst(String name, String value) {
    return "const " + name + " = `" + value + "`;\n";
  }

  private static String getJavaScriptSource(AssetManager am) {
    try {
      String src = "";
      src += jsInitConst("NODE_SSL_CA", SSL_CA);
      src += jsInitConst("NODE_SSL_CRT", DEBUG_SSL_CRT);
      src += jsInitConst("NODE_SSL_KEY", DEBUG_SSL_KEY);
      System.out.println(src);
      src += IOUtils.toString(am.open("js/flowcrypt-android.js"), StandardCharsets.UTF_8);
      return src;
    } catch(IOException e) {
      e.printStackTrace();
      return "require('http')" +
          ".createServer((request, response) => {" +
          "   response.end('{\"error\": {\"message\": \"getAssets IOException\",\"stack\":\"Java\"}}')" +
          "}).listen(3000, 'localhost')";
    }
  }

  /**
   * A native method that is implemented by the 'native-lib' native library,
   * which is packaged with this application.
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);

}
