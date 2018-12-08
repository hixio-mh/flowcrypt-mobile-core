package com.yourorg.sample.node;

import android.content.res.AssetManager;

import com.yourorg.sample.node.results.RawNodeResult;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpEntity;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.json.JSONException;
import org.json.JSONObject;
import org.spongycastle.asn1.x500.X500Name;
import org.spongycastle.asn1.x509.Extension;
import org.spongycastle.asn1.x509.KeyUsage;
import org.spongycastle.asn1.x509.SubjectPublicKeyInfo;
import org.spongycastle.cert.X509CertificateHolder;
import org.spongycastle.cert.X509v3CertificateBuilder;
import org.spongycastle.jce.provider.BouncyCastleProvider;
import org.spongycastle.operator.jcajce.JcaContentSignerBuilder;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.StringWriter;
import java.math.BigInteger;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Security;
import java.security.cert.CertificateEncodingException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Date;
import java.util.stream.Collectors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.KeyManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import javax.xml.bind.DatatypeConverter;

class NativeNode {

  static { // Used to load the 'native-lib' library on application startup.s
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  private boolean isRunning = false;
  private Secrets secrets = null;

  NativeNode() throws Exception {
    try {
      secrets = SecretsFactory.generate();
    } catch(Exception e) {
      throw new Exception("Could not initialize NativeNode secrets", e);
    }
  }

  RawNodeResult request(String endpoint, JSONObject req, byte[] data) {
    long startTime = System.currentTimeMillis();
    try {
      MultipartEntityBuilder builder = MultipartEntityBuilder.create();
      builder.setMode(HttpMultipartMode.BROWSER_COMPATIBLE);
      builder.addTextBody("endpoint", endpoint);
      builder.addTextBody("request", req != null ? req.toString() : "{}");
      builder.addBinaryBody("data", new ByteArrayInputStream(data != null ? data : new byte[0]));
      URL url = new URL("https://localhost:3000/");
      HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
      conn.setRequestMethod("POST");
      conn.setRequestProperty("Authorization", secrets.authHeader);
      conn.setRequestProperty("Connection", "Keep-Alive");
      conn.setDoInput(true);
      conn.setDoOutput(true);
      conn.setSSLSocketFactory(secrets.sslContext.getSocketFactory());
      HttpEntity parts = builder.build();
      conn.addRequestProperty(parts.getContentType().getName(), parts.getContentType().getValue());
      OutputStream os = conn.getOutputStream();
      parts.writeTo(os);
      conn.connect();
      if(conn.getResponseCode() == 200) {
        return new RawNodeResult(null, conn.getInputStream(), System.currentTimeMillis() - startTime);
      } else {
        return new RawNodeResult(NodeError.fromConnection(conn), null, System.currentTimeMillis() - startTime);
      }
    } catch (Exception e) {
      e.printStackTrace();
      return new RawNodeResult(e, null, System.currentTimeMillis() - startTime);
    }
  }

  void startIfNotRunning(final AssetManager am) {
    if(!isRunning) {
      isRunning = true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          start(am);
          isRunning = false; // if it ever stops running, set isRunning back to false
        }
      }).start();
    }
  }

  private void start(AssetManager am) {
    try {
      startNodeWithArguments(new String[]{"node", "-e", getJsSrc(am)});
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  private static String jsInitConst(String name, String value) {
    return "const " + name + " = `" + value + "`;\n";
  }

  private String getJsSrc(AssetManager am) throws Exception {
    String src = "";
    src += jsInitConst("NODE_SSL_CRT", secrets.crt);
    src += jsInitConst("NODE_SSL_KEY", secrets.key);
    src += jsInitConst("NODE_AUTH_HEADER", secrets.authHeader);
    src += IOUtils.toString(am.open("js/flowcrypt-android.js"), StandardCharsets.UTF_8);
    return src;
  }

  /**
   * A native method that is implemented by the 'native-lib' native library,
   * which is packaged with this application.
   */
  @SuppressWarnings("JniMissingFunction")
  public native Integer startNodeWithArguments(String[] arguments);

}

class NodeError extends Exception {

  static NodeError fromConnection(HttpsURLConnection conn) {
    int errCode;
    try {
      errCode = conn.getResponseCode();
    } catch (IOException e) {
      return new NodeError(0, e.getMessage(), null);
    }
    String res = new BufferedReader(new InputStreamReader(conn.getErrorStream())).lines().collect(Collectors.joining("\n"));
    try {
      JSONObject obj = new JSONObject(res);
      JSONObject error = obj.getJSONObject("error");
      String stack = error.getString("stack");
      return new NodeError(errCode, error.getString("message"), newStackTraceElement(stack));
    } catch (JSONException e) {
      return new NodeError(errCode, "Node http err without err obj",  newStackTraceElement("[RES]" + res));
    }
  }

  private NodeError(int httpErrCode, String errMsg, StackTraceElement addStackTraceElement) {
    super(Integer.valueOf(httpErrCode).toString() + " " + errMsg);
    StackTraceElement[] origStack = getStackTrace();
    StackTraceElement[] newStack = Arrays.copyOf(origStack, origStack.length + 1);
    newStack[origStack.length] = addStackTraceElement;
    setStackTrace(newStack);
  }

  static private StackTraceElement newStackTraceElement(String data) {
    return new StackTraceElement("=========================", "\n[node.js] " + data, "flowcrypt-android.js", -1);
  }

}

class Secrets {
  String key;
  String crt;
  String authPwd;
  String authHeader;
  SSLContext sslContext;
}

class SecretsFactory {

  static private SecureRandom secureRandom = new SecureRandom();

  static {
    BouncyCastleProvider prov = new org.spongycastle.jce.provider.BouncyCastleProvider();
    Security.addProvider(prov);
  }

  static Secrets generate() throws Exception {
    // new keypair
    KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
    keyGen.initialize(2048, secureRandom);
    KeyPair pair = keyGen.generateKeyPair();
    // new self-signed ssl cert
    X500Name sub = new X500Name("CN=localhost");
    BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());
    Date from = new Date(System.currentTimeMillis());
    Date to = new Date(System.currentTimeMillis() + Long.valueOf("788400000000")); // 25 years
    SubjectPublicKeyInfo info = SubjectPublicKeyInfo.getInstance(pair.getPublic().getEncoded());
    X509v3CertificateBuilder certBuilder = new X509v3CertificateBuilder(sub, serial, from, to, sub, info);
    KeyUsage ku = new KeyUsage(KeyUsage.digitalSignature | KeyUsage.keyEncipherment | KeyUsage.dataEncipherment | KeyUsage.keyAgreement);
    certBuilder.addExtension(Extension.keyUsage, true, ku);
    JcaContentSignerBuilder signerBuilder = new JcaContentSignerBuilder("SHA256WithRSAEncryption");
    X509CertificateHolder holder = certBuilder.build(signerBuilder.build(pair.getPrivate()));
    InputStream is = new ByteArrayInputStream(holder.getEncoded());
    CertificateFactory cf = CertificateFactory.getInstance("X.509", BouncyCastleProvider.PROVIDER_NAME);
    X509Certificate crt = (X509Certificate) cf.generateCertificate(is);
    // new sslContext for http client that accepts this self-signed cert
    KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
    keyStore.load(null, null);
    keyStore.setCertificateEntry("crt", crt);
    TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    tmf.init(keyStore);
    SSLContext sslContext = SSLContext.getInstance("TLS");
    KeyManagerFactory clientKmFactory = KeyManagerFactory.getInstance("X509");
    clientKmFactory.init(keyStore, null); // the second param is password - could also try empty string
    KeyManager[] clientKm = clientKmFactory.getKeyManagers();
    sslContext.init(clientKm, tmf.getTrustManagers(), secureRandom);
    // return all that plus new passwords
    Secrets secrets = new Secrets();
    secrets.crt = crtToString(crt);
    secrets.key = keyToString(pair.getPrivate());
    secrets.sslContext = sslContext;
    secrets.authPwd = genPwd();
    secrets.authHeader = "Basic " + DatatypeConverter.printBase64Binary(secrets.authPwd.getBytes());
    return secrets;
  }

  private static String crtToString(X509Certificate cert) throws CertificateEncodingException {
    StringWriter sw = new StringWriter();
    sw.write("-----BEGIN CERTIFICATE-----\n");
    sw.write(DatatypeConverter.printBase64Binary(cert.getEncoded()).replaceAll("(.{64})", "$1\n"));
    sw.write("\n-----END CERTIFICATE-----\n");
    return sw.toString();
  }

  private static String keyToString(PrivateKey prv) {
    StringWriter sw = new StringWriter();
    sw.write("-----BEGIN RSA PRIVATE KEY-----\n");
    sw.write(DatatypeConverter.printBase64Binary(prv.getEncoded()).replaceAll("(.{64})", "$1\n"));
    sw.write("\n-----END RSA PRIVATE KEY-----\n");
    return sw.toString();
  }

  private static String genPwd() {
    byte bytes[] = new byte[32];
    secureRandom.nextBytes(bytes);
    return DatatypeConverter.printBase64Binary(bytes);
  }

}