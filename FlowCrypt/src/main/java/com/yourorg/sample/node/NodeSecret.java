package com.yourorg.sample.node;

import org.spongycastle.asn1.x500.X500Name;
import org.spongycastle.asn1.x509.Extension;
import org.spongycastle.asn1.x509.KeyUsage;
import org.spongycastle.asn1.x509.SubjectPublicKeyInfo;
import org.spongycastle.cert.X509CertificateHolder;
import org.spongycastle.cert.X509v3CertificateBuilder;
import org.spongycastle.jce.provider.BouncyCastleProvider;
import org.spongycastle.operator.ContentSigner;
import org.spongycastle.operator.jcajce.JcaContentSignerBuilder;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.StringWriter;
import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateEncodingException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Date;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import javax.xml.bind.DatatypeConverter;

public class NodeSecret {

  static {
    BouncyCastleProvider prov = new BouncyCastleProvider();
    Security.addProvider(prov);
  }

  private String HEADER_CRT_BEGIN = "-----BEGIN CERTIFICATE-----\n";
  private String HEADER_CRT_END = "\n-----END CERTIFICATE-----\n";
  private String HEADER_PRV_BEGIN = "-----BEGIN RSA PRIVATE KEY-----\n";
  private String HEADER_PRV_END = "\n-----END RSA PRIVATE KEY-----\n";

  private SecureRandom secureRandom = new SecureRandom();
  private X500Name issuer = new X500Name("CN=CA Cert");
  private X509Certificate caCrt;
  private X509Certificate srvCrt;
  private PrivateKey srvKey;

  int port;
  String ca;
  String key;
  String crt;
  String authPwd;
  String authHeader;
  SSLContext sslContext;

  public NodeSecret() throws Exception {
    this(null);
  }

  public NodeSecret(NodeSecretCerts nodeSecretCertsCache) throws Exception {
    if(nodeSecretCertsCache != null) {
      ca = nodeSecretCertsCache.ca;
      crt = nodeSecretCertsCache.crt;
      key = nodeSecretCertsCache.key;
      caCrt = parseCert(ca);
      srvCrt = parseCert(crt);
      srvKey = parseKey(key);
    } else {
      genCerts();
      ca = crtToString(caCrt);
      crt = crtToString(srvCrt);
      key = keyToString(srvKey);
    }
    this.sslContext = newSslContext();
    genAuthPwdAndHeader();
  }

  public NodeSecretCerts getCache() {
    return NodeSecretCerts.fromNodeSecret(this);
  }

  private X509Certificate parseCert(String certString) throws CertificateException {
    certString = certString.replace(HEADER_CRT_BEGIN, "").replace(HEADER_CRT_END, "").replaceAll("\\n", "");
    ByteArrayInputStream is = new ByteArrayInputStream(DatatypeConverter.parseBase64Binary(certString));
    return (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(is);
  }

  private PrivateKey parseKey(String keyString) throws NoSuchAlgorithmException, InvalidKeySpecException {
    keyString = keyString.replace(HEADER_PRV_BEGIN, "").replace(HEADER_PRV_END, "").replaceAll("\\n", "");
    byte[] keyBytes = DatatypeConverter.parseBase64Binary(keyString);
    KeyFactory kf = KeyFactory.getInstance("RSA");
    return kf.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
  }

  private SSLContext newSslContext() throws Exception {
    // create trust manager that trusts ca to verify server crt
    TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    tmf.init(newKeyStore("ca", caCrt, null)); // trust our ca
    // create key manager to supply client key and crt (client and server use the same keypair)
    KeyManagerFactory clientKmFactory = KeyManagerFactory.getInstance("X509");
    clientKmFactory.init(newKeyStore("crt", srvCrt, srvKey), null);
    // new sslContext for http client that trusts the ca and provides client cert
    SSLContext sslContext = SSLContext.getInstance("TLS");
    sslContext.init(clientKmFactory.getKeyManagers(), tmf.getTrustManagers(), secureRandom);
    return sslContext;
  }

  private void genCerts() throws Exception {
    // new rsa key generator
    KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
    keyGen.initialize(2048, secureRandom);

    // new self-signed ca keypair and crt
    KeyPair caKeypair = keyGen.generateKeyPair();
    int caKu = KeyUsage.digitalSignature | KeyUsage.keyCertSign;
    caCrt = newSignedCrt(caKeypair, caKeypair, issuer, caKu);

    // new ca-signed srv crt and key (also used for client)
    KeyPair srvKeypair = keyGen.generateKeyPair();
    int srvKu = KeyUsage.digitalSignature | KeyUsage.keyEncipherment | KeyUsage.dataEncipherment | KeyUsage.keyAgreement;
    srvCrt = newSignedCrt(caKeypair, srvKeypair, new X500Name("CN=localhost"), srvKu);
    srvKey = srvKeypair.getPrivate();
  }

  private void genAuthPwdAndHeader() {
    this.authPwd = genPwd();
    this.authHeader = "Basic " + DatatypeConverter.printBase64Binary(this.authPwd.getBytes());
  }

  private KeyStore newKeyStore(String alias, Certificate crt, PrivateKey prv) throws Exception {
    KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
    keyStore.load(null, null);
    keyStore.setCertificateEntry(alias, crt); // todo - possible fail point
    if(prv != null) { // todo - most likely current failpoint is here or line above for client certs
      keyStore.setKeyEntry(alias, prv, null, new Certificate[]{crt});
    }
    return keyStore;
  }

  private X509Certificate newSignedCrt(KeyPair issuerKeypair, KeyPair subjectKeyPair, X500Name subject, int keyUsage) throws Exception {
    BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());
    Date from = new Date(System.currentTimeMillis());
    Date to = new Date(System.currentTimeMillis() + Long.valueOf("788400000000")); // 25 years
    SubjectPublicKeyInfo info = SubjectPublicKeyInfo.getInstance(subjectKeyPair.getPublic().getEncoded());
    X509v3CertificateBuilder subjectCertBuilder = new X509v3CertificateBuilder(issuer, serial, from, to, subject, info);
    subjectCertBuilder.addExtension(Extension.keyUsage, true, new KeyUsage(keyUsage));
    ContentSigner signer = new JcaContentSignerBuilder("SHA256WithRSAEncryption").build(issuerKeypair.getPrivate());
    X509CertificateHolder crtHolder = subjectCertBuilder.build(signer);
    InputStream is = new ByteArrayInputStream(crtHolder.getEncoded());
    CertificateFactory cf = CertificateFactory.getInstance("X.509", BouncyCastleProvider.PROVIDER_NAME);
    return (X509Certificate) cf.generateCertificate(is);
  }

  private String crtToString(X509Certificate cert) throws CertificateEncodingException {
    StringWriter sw = new StringWriter();
    sw.write(HEADER_CRT_BEGIN);
    sw.write(DatatypeConverter.printBase64Binary(cert.getEncoded()).replaceAll("(.{64})", "$1\n"));
    sw.write(HEADER_CRT_END);
    return sw.toString();
  }

  private String keyToString(PrivateKey prv) {
    StringWriter sw = new StringWriter();
    sw.write(HEADER_PRV_BEGIN);
    sw.write(DatatypeConverter.printBase64Binary(prv.getEncoded()).replaceAll("(.{64})", "$1\n"));
    sw.write(HEADER_PRV_END);
    return sw.toString();
  }

  private String genPwd() {
    byte bytes[] = new byte[32];
    secureRandom.nextBytes(bytes);
    return DatatypeConverter.printBase64Binary(bytes);
  }

}
