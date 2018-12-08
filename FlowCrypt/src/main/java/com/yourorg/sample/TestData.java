package com.yourorg.sample;

import com.yourorg.sample.node.results.PgpKeyInfo;

public class TestData {

  public static String[] passphrases = new String[]{"some long pp"};
  public static String[] eccPubKeys = new String[]{"-----BEGIN PGP PUBLIC KEY BLOCK-----\n" +
      "Version: FlowCrypt 6.3.5 Gmail Encryption\n" +
      "Comment: Seamlessly send and receive encrypted email\n" +
      "\n" +
      "xjMEXAZt6RYJKwYBBAHaRw8BAQdAHk2PLEMfkVLjxI6Vdg+dnJ5ElKcAX78x\n" +
      "P+GVCYDZyfLNEXVzciA8dXNyQHVzci5jb20+wncEEBYKACkFAlwGbekGCwkH\n" +
      "CAMCCRAGNjWz4z6xTAQVCAoCAxYCAQIZAQIbAwIeAQAA5H0A/3J+MZijs58O\n" +
      "o18O5vY33swAREm78aQLAUi9JWMkxdYOAQD2Cl58wQDDoyx2fgmS9NQOSON+\n" +
      "TCaGfIaPldt923KqD844BFwGbekSCisGAQQBl1UBBQEBB0BqkLKrGBakm/MV\n" +
      "NicvptKH4c7UdikdbpHPlfg2srb/dQMBCAfCYQQYFggAEwUCXAZt6QkQBjY1\n" +
      "s+M+sUwCGwwAAJQrAP4xAV2NYRnB8CcllBYvHeOkXE3K4qNQRHmFF+mEhcZ6\n" +
      "pQD/TCpMKlsFZCVzCaXyOohESrVD+UM7f/1A9QsqKh7Zmgw=\n" +
      "=WZgv\n" +
      "-----END PGP PUBLIC KEY BLOCK-----\n"};
  public static String eccPrvKey = "-----BEGIN PGP PRIVATE KEY BLOCK-----\n" +
      "Version: FlowCrypt 6.3.5 Gmail Encryption\n" +
      "Comment: Seamlessly send and receive encrypted email\n" +
      "\n" +
      "xYYEXAZt6RYJKwYBBAHaRw8BAQdAHk2PLEMfkVLjxI6Vdg+dnJ5ElKcAX78x\n" +
      "P+GVCYDZyfL+CQMI1riV1EDicFNg4/f/0U/ZJZ9udC0F7GvtFKagL3EIqz6f\n" +
      "m+bm2E5qdDdyM2Z/7U2YOOVPc/HBxTg9SHrCTAYmfLtXEwU21uRzKIW9Y6N0\n" +
      "Ls0RdXNyIDx1c3JAdXNyLmNvbT7CdwQQFgoAKQUCXAZt6QYLCQcIAwIJEAY2\n" +
      "NbPjPrFMBBUICgIDFgIBAhkBAhsDAh4BAADkfQD/cn4xmKOznw6jXw7m9jfe\n" +
      "zABESbvxpAsBSL0lYyTF1g4BAPYKXnzBAMOjLHZ+CZL01A5I435MJoZ8ho+V\n" +
      "233bcqoPx4sEXAZt6RIKKwYBBAGXVQEFAQEHQGqQsqsYFqSb8xU2Jy+m0ofh\n" +
      "ztR2KR1ukc+V+Daytv91AwEIB/4JAwhPqxwBR+9JFWD07K5gQ/ahdz6fd7jf\n" +
      "piGAGZfJc3qN/W9MTqZcsl0qIiM4IaMeAuqlqm5xVHSHA3r7SnyfGtzDURM+\n" +
      "c9pzQRYLwp33TgHXwmEEGBYIABMFAlwGbekJEAY2NbPjPrFMAhsMAACUKwD+\n" +
      "MQFdjWEZwfAnJZQWLx3jpFxNyuKjUER5hRfphIXGeqUA/0wqTCpbBWQlcwml\n" +
      "8jqIREq1Q/lDO3/9QPULKioe2ZoM\n" +
      "=8qZ6\n" +
      "-----END PGP PRIVATE KEY BLOCK-----";

  public static PgpKeyInfo[] eccPrvKeyInfo = new PgpKeyInfo[] { new PgpKeyInfo(eccPrvKey, "063635B3E33EB14C")};
}
