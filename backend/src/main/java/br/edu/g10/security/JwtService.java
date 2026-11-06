package br.edu.g10.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private static final String HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    private static final long TTL_SECONDS = 2 * 60 * 60;
    private final ObjectMapper json;
    private final byte[] secret;

    public JwtService(ObjectMapper json, @Value("${app.jwt-secret}") String secret) {
        this.json = json;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        if (this.secret.length < 32) throw new IllegalArgumentException("JWT_SECRET deve conter pelo menos 32 bytes");
    }

    public String issue(UserPrincipal user) {
        try {
            long now = Instant.now().getEpochSecond();
            String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                json.writeValueAsBytes(new Claims("g10-academico", user.id(), user.login(),
                    user.nome(), user.perfil(), now, now + TTL_SECONDS)));
            String data = HEADER + "." + payload;
            return data + "." + sign(data);
        } catch (Exception ex) { throw new IllegalStateException("Erro ao gerar token", ex); }
    }

    public UserPrincipal verify(String token) {
        try {
            String[] pieces = token.split("\\.", -1);
            if (pieces.length != 3 || !HEADER.equals(pieces[0]) || token.length() > 6000)
                throw new IllegalArgumentException("Token inválido");
            String data = pieces[0] + "." + pieces[1];
            byte[] expected = Base64.getUrlDecoder().decode(sign(data));
            byte[] received = Base64.getUrlDecoder().decode(pieces[2]);
            if (!MessageDigest.isEqual(expected, received)) throw new IllegalArgumentException("Assinatura inválida");
            JsonNode p = json.readTree(Base64.getUrlDecoder().decode(pieces[1]));
            long now = Instant.now().getEpochSecond();
            if (!"g10-academico".equals(p.path("iss").asText()) || p.path("exp").asLong() <= now
                    || p.path("iat").asLong() > now + 60 || p.path("id").asLong() <= 0)
                throw new IllegalArgumentException("Token expirado ou inválido");
            String role = p.path("perfil").asText();
            if (!role.equals("PROFESSOR") && !role.equals("COORDENADOR"))
                throw new IllegalArgumentException("Perfil inválido");
            if (p.path("login").asText().isBlank()) throw new IllegalArgumentException("Login inválido");
            return new UserPrincipal(p.path("id").asLong(), p.path("login").asText(),
                p.path("nome").asText(), role);
        } catch (Exception ex) { throw new IllegalArgumentException("Token inválido ou expirado", ex); }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.US_ASCII)));
    }

    private record Claims(String iss, long id, String login, String nome, String perfil,
                          long iat, long exp) {}
}
