package com.yourorg.sample.node;

public class NodeSecretCerts implements java.io.Serializable {

  String ca;
  String key;
  String crt;

  private NodeSecretCerts() {

  }

  static NodeSecretCerts fromNodeSecret(NodeSecret nodeSecret) {
    NodeSecretCerts nodeSecretCerts = new NodeSecretCerts();
    nodeSecretCerts.ca = nodeSecret.ca;
    nodeSecretCerts.crt = nodeSecret.crt;
    nodeSecretCerts.key = nodeSecret.key;
    return nodeSecretCerts;
  }

}
