package com.jaeseok614.winagainfootball;

import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;

/** Accept only server-signed, installation-bound, short-lived full-game grants. */
final class EntitlementVerifier {
    static final String PACKAGE = "com.jaeseok614.winagainfootball";
    static final String PRODUCT = "full_game";
    static final long MAX_SECONDS = 7 * 24 * 60 * 60;
    static long verify(String jwt, String publicKey, String installation, String nonce, long now) {
        try {
            if (jwt == null || jwt.length() > 16384 || publicKey.isEmpty()) return 0;
            String[] parts = jwt.split("\\.", -1);
            if (parts.length != 3) return 0;
            JSONObject header = json(parts[0]);
            if (!"RS256".equals(header.optString("alg")) || !"JWT".equals(header.optString("typ"))) return 0;
            RSAPublicKey key = (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(
                new X509EncodedKeySpec(Base64.decode(publicKey, Base64.DEFAULT)));
            if (key.getModulus().bitLength() < 2048) return 0;
            Signature signature = Signature.getInstance("SHA256withRSA"); signature.initVerify(key);
            signature.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            if (!signature.verify(Base64.decode(parts[2], Base64.URL_SAFE | Base64.NO_WRAP))) return 0;
            JSONObject payload = json(parts[1]);
            long issued = payload.getLong("iat"), expires = payload.getLong("exp");
            if (!PACKAGE.equals(payload.optString("iss")) || !PRODUCT.equals(payload.optString("product"))
                    || !installation.equals(payload.optString("aud")) || expires <= now || issued > now + 300
                    || expires <= issued || expires - issued > MAX_SECONDS
                    || (nonce != null && !nonce.equals(payload.optString("nonce")))) return 0;
            return expires;
        } catch (Exception error) { return 0; }
    }
    private static JSONObject json(String text) throws Exception {
        return new JSONObject(new String(Base64.decode(text, Base64.URL_SAFE | Base64.NO_WRAP), StandardCharsets.UTF_8));
    }
}
