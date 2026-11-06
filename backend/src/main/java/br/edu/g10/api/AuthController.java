package br.edu.g10.api;

import br.edu.g10.security.JwtService;
import br.edu.g10.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final JwtService tokens;
    private final PasswordEncoder encoder;

    public AuthController(@Qualifier("authJdbc") JdbcTemplate jdbc,
                          JwtService tokens, PasswordEncoder encoder) {
        this.jdbc = jdbc; this.tokens = tokens; this.encoder = encoder;
    }

    public record LoginRequest(@NotBlank String login, @NotBlank String senha) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest body) {
        var rows = jdbc.queryForList(
            "SELECT id, login, nome, perfil, senha_hash, ativo FROM app.usuarios WHERE login = ?",
            body.login().trim().toLowerCase());
        if (rows.size() != 1 || !Boolean.TRUE.equals(rows.get(0).get("ativo"))
            || !encoder.matches(body.senha(), String.valueOf(rows.get(0).get("senha_hash"))))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login ou senha incorretos");
        var row = rows.get(0);
        var user = new UserPrincipal(((Number)row.get("id")).longValue(),
            (String) row.get("login"), (String) row.get("nome"), (String) row.get("perfil"));
        return Map.of("token", tokens.issue(user), "usuario", user);
    }

    @GetMapping("/me")
    public UserPrincipal me(@AuthenticationPrincipal UserPrincipal user) { return user; }
}
