package com.yourorg.sample;

import android.content.res.AssetManager;

import org.apache.commons.io.IOUtils;
import org.spongycastle.asn1.x500.X500Name;
import org.spongycastle.asn1.x509.Extension;
import org.spongycastle.asn1.x509.KeyUsage;
import org.spongycastle.asn1.x509.SubjectPublicKeyInfo;
import org.spongycastle.cert.X509CertificateHolder;
import org.spongycastle.cert.X509v3CertificateBuilder;
import org.spongycastle.jce.provider.BouncyCastleProvider;
import org.spongycastle.operator.ContentSigner;
import org.spongycastle.operator.OperatorCreationException;
import org.spongycastle.operator.jcajce.JcaContentSignerBuilder;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.math.BigInteger;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateEncodingException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.stream.Collectors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;
import javax.xml.bind.DatatypeConverter;

public class Node {

  private static NativeNodeWrapper nativeWrapper;

  static {
    try {
      nativeWrapper = new NativeNodeWrapper();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  public static void start(AssetManager am) {
    nativeWrapper.startIfNotRunning(am);
  }

  public static String request(String endpoint) {
    try {
      URL url = new URL("https://localhost:3000/" + endpoint);
      HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
      conn.setSSLSocketFactory(nativeWrapper.getCustomCaTlsSocketFactory());
      return new BufferedReader(new InputStreamReader(conn.getInputStream())).lines().collect(Collectors.joining());
    } catch (Exception e) {
      e.printStackTrace();
      return e.toString();
    }
  }

}

class NativeNodeWrapper {

  static { // Used to load the 'native-lib' library on application startup.s
    System.loadLibrary("native-lib");
    System.loadLibrary("node");
  }

  private boolean isRunning = false;
  private SSLContext sslContext = null;
  private Pems pems = null;

  NativeNodeWrapper() throws Exception {
    try {
      pems = SslCertificateFactory.newPems();
      CertificateFactory cf = CertificateFactory.getInstance("X.509");
      Certificate cert = cf.generateCertificate(new ByteArrayInputStream(pems.crt.getBytes()));
      KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
      keyStore.load(null, null);
      keyStore.setCertificateEntry("ca", cert);
      TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
      tmf.init(keyStore);
      sslContext = SSLContext.getInstance("TLS");
      sslContext.init(null, tmf.getTrustManagers(), null);
    } catch(Exception e) {
      throw new Exception("Could not initialize NativeNodeWrapper TLS", e);
    }
  }

  SSLSocketFactory getCustomCaTlsSocketFactory() {
    return sslContext.getSocketFactory();
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
    src += jsInitConst("NODE_SSL_CRT", pems.crt);
    src += jsInitConst("NODE_SSL_KEY", pems.key);
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

class Pems {
  String key;
  String crt;
}

class SslCertificateFactory {

  static {
    BouncyCastleProvider prov = new org.spongycastle.jce.provider.BouncyCastleProvider();
    Security.addProvider(prov);
  }

  static Pems newPems() throws NoSuchAlgorithmException, CertificateException, IOException, OperatorCreationException, NoSuchProviderException {
    KeyPair pair;
    KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
    gen.initialize(2048, new SecureRandom());
    pair = gen.generateKeyPair();
    X500Name sub = new X500Name("CN=localhost");
    BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());
    Date from = new Date(System.currentTimeMillis());
    Date to = new Date(System.currentTimeMillis() + Long.valueOf("788400000000")); // 25 years
    SubjectPublicKeyInfo info = SubjectPublicKeyInfo.getInstance(pair.getPublic().getEncoded());
    X509v3CertificateBuilder certBuilder = new X509v3CertificateBuilder(sub, serial, from, to, sub, info);
    KeyUsage ku = new KeyUsage(KeyUsage.digitalSignature | KeyUsage.keyEncipherment | KeyUsage.dataEncipherment | KeyUsage.keyAgreement);
    certBuilder.addExtension(Extension.keyUsage, true, ku);
    JcaContentSignerBuilder builder = new JcaContentSignerBuilder("SHA256WithRSAEncryption");
    ContentSigner signer = builder.build(pair.getPrivate());
    X509CertificateHolder holder = certBuilder.build(signer);
    InputStream is = new ByteArrayInputStream(holder.getEncoded());
    CertificateFactory cf = CertificateFactory.getInstance("X.509", BouncyCastleProvider.PROVIDER_NAME);
    X509Certificate crt = (X509Certificate) cf.generateCertificate(is);
    Pems pems = new Pems();
    pems.crt = crtToString(crt);
    pems.key = keyToString(pair.getPrivate());
    return pems;
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

}