package br.edu.g10.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private final JwtService jwt = new JwtService(new ObjectMapper(),
        "test-only-strong-secret-1234567890-abcdefghijklmnopqrstuvwxyz");

    @Test void tokenValidoMantemIdentidade() {
        var user = new UserPrincipal(2, "ana", "Professora Ana", "PROFESSOR");
        var result = jwt.verify(jwt.issue(user));
        assertEquals(user, result);
    }

    @Test void tokenAlteradoEhRejeitado() {
        var user = new UserPrincipal(2, "ana", "Professora Ana", "PROFESSOR");
        var valid = jwt.issue(user);
        String[] parts = valid.split("\\.");
        parts[2] = (parts[2].charAt(0) == 'a' ? "b" : "a") + parts[2].substring(1);
        var damaged = String.join(".", parts);
        assertThrows(IllegalArgumentException.class, () -> jwt.verify(damaged));
    }
}
