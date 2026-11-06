package br.edu.g10.config;

import br.edu.g10.security.UserPrincipal;
import java.util.function.Function;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

/**
 * Uma transação Spring = uma conexão PostgreSQL fixa no PgBouncer transaction mode.
 * SET LOCAL da identidade do usuário é válido só até o COMMIT/ROLLBACK.
 * Cada perfil utiliza CREDENCIAIS SQL diferentes, além das políticas RLS.
 */
@Service
public class DatabaseExecutor {
    private final JdbcTemplate profJdbc;
    private final JdbcTemplate coordJdbc;
    private final TransactionTemplate profTx;
    private final TransactionTemplate coordTx;

    public DatabaseExecutor(@Qualifier("profDs") DataSource prof,
                            @Qualifier("coordDs") DataSource coord) {
        profJdbc = new JdbcTemplate(prof);
        coordJdbc = new JdbcTemplate(coord);
        profTx = new TransactionTemplate(new DataSourceTransactionManager(prof));
        coordTx = new TransactionTemplate(new DataSourceTransactionManager(coord));
    }

    public <T> T run(Function<JdbcTemplate, T> action) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal user))
            throw new SecurityException("Usuário não autenticado");
        boolean coordinator = "COORDENADOR".equals(user.perfil());
        JdbcTemplate jdbc = coordinator ? coordJdbc : profJdbc;
        TransactionTemplate transaction = coordinator ? coordTx : profTx;
        return transaction.execute(status -> {
            jdbc.queryForObject("SELECT set_config('app.usuario_id', ?, true)",
                String.class, Long.toString(user.id()));
            return action.apply(jdbc);
        });
    }

    public UserPrincipal user() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal user))
            throw new SecurityException("Usuário não autenticado");
        return user;
    }
}
