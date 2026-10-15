package es.cerebro.worker.preprod;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public final class TokenStore {
  private static final String PREFS = "cerebro_transport_secret_preprod_v1";
  private static final String ALIAS = "cerebro_preprod_transport_v1";
  private static final String KEY_CIPHER = "transport_token_cipher";
  private static final String KEY_IV = "transport_token_iv";

  private TokenStore() {}

  private static SharedPreferences p(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

  private static SecretKey key() throws Exception {
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
    KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    kg.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .build());
    return kg.generateKey();
  }

  public static synchronized String getOrCreate(Context c) throws Exception {
    String cipherText = p(c).getString(KEY_CIPHER, null);
    String ivText = p(c).getString(KEY_IV, null);
    if (cipherText != null && ivText != null) {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      byte[] iv = Base64.decode(ivText, Base64.NO_WRAP);
      cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
      return new String(cipher.doFinal(Base64.decode(cipherText, Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    byte[] raw = new byte[32];
    new SecureRandom().nextBytes(raw);
    String token = Base64.encodeToString(raw, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    byte[] enc = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
    p(c).edit()
      .putString(KEY_CIPHER, Base64.encodeToString(enc, Base64.NO_WRAP))
      .putString(KEY_IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
      .apply();
    return token;
  }

  public static String sha256(String value) throws Exception {
    byte[] d = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
    StringBuilder b = new StringBuilder();
    for (byte x : d) b.append(String.format("%02x", x & 0xff));
    return b.toString();
  }
}
