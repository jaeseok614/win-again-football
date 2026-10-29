package com.jaeseok614.winagainfootball;

import android.util.Base64;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public final class EntitlementVerifierTest {
    private String encoded(byte[] value){return Base64.encodeToString(value,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);}
    private String signed(KeyPair pair,JSONObject payload) throws Exception {
        String body=encoded("{\"alg\":\"RS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8))+"."+encoded(payload.toString().getBytes(StandardCharsets.UTF_8));
        Signature signature=Signature.getInstance("SHA256withRSA");signature.initSign(pair.getPrivate());signature.update(body.getBytes(StandardCharsets.US_ASCII));
        return body+"."+encoded(signature.sign());
    }
    private KeyPair keys() throws Exception {KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);return generator.generateKeyPair();}
    private JSONObject grant() throws Exception {return new JSONObject().put("iss",EntitlementVerifier.PACKAGE).put("product","full_game").put("aud","installation").put("nonce","request-nonce").put("iat",1000).put("exp",1000+EntitlementVerifier.MAX_SECONDS);}
    private String publicKey(KeyPair pair){return Base64.encodeToString(pair.getPublic().getEncoded(),Base64.NO_WRAP);}
    @Test public void validGrantIsBoundToInstallationNonceAndExpiry() throws Exception {
        KeyPair pair=keys();String jwt=signed(pair,grant()),key=publicKey(pair);
        assertTrue(EntitlementVerifier.verify(jwt,key,"installation","request-nonce",1001)>0);
        assertTrue(EntitlementVerifier.verify(jwt,key,"installation",null,1001)>0);
        assertEquals(0,EntitlementVerifier.verify(jwt,key,"other-installation",null,1001));
        assertEquals(0,EntitlementVerifier.verify(jwt,key,"installation","wrong-nonce",1001));
        assertEquals(0,EntitlementVerifier.verify(jwt,key,"installation",null,1000+EntitlementVerifier.MAX_SECONDS));
        assertEquals(0,EntitlementVerifier.verify(jwt,key,"installation",null,1));
    }
    @Test public void forgedWrongProductWrongKeyAndUnboundedGrantsFailClosed() throws Exception {
        KeyPair pair=keys();String key=publicKey(pair),jwt=signed(pair,grant());
        assertEquals(0,EntitlementVerifier.verify(jwt,publicKey(keys()),"installation",null,1001));
        String[] parts=jwt.split("\\.");String tampered=parts[0]+"."+encoded(grant().put("aud","attacker").toString().getBytes(StandardCharsets.UTF_8))+"."+parts[2];
        assertEquals(0,EntitlementVerifier.verify(tampered,key,"attacker",null,1001));
        assertEquals(0,EntitlementVerifier.verify(signed(pair,grant().put("product","other")),key,"installation",null,1001));
        assertEquals(0,EntitlementVerifier.verify(signed(pair,grant().put("exp",1001+EntitlementVerifier.MAX_SECONDS)),key,"installation",null,1001));
        assertEquals(0,EntitlementVerifier.verify("not.a.receipt",key,"installation",null,1001));
        assertEquals(0,EntitlementVerifier.verify(jwt,"","installation",null,1001));
    }
}
