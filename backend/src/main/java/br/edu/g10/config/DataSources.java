package br.edu.g10.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DataSources {
    @Value("${app.db.url}") private String url;
    @Value("${app.db.auth-user}") private String authUser;
    @Value("${app.db.auth-password}") private String authPassword;
    @Value("${app.db.professor-user}") private String professorUser;
    @Value("${app.db.professor-password}") private String professorPassword;
    @Value("${app.db.coord-user}") private String coordUser;
    @Value("${app.db.coord-password}") private String coordPassword;

    private HikariDataSource pool(String name, String user, String password, int size) {
        HikariConfig c = new HikariConfig();
        c.setJdbcUrl(url);
        c.setUsername(user);
        c.setPassword(password);
        c.setPoolName(name);
        c.setMaximumPoolSize(size);
        c.setMinimumIdle(1);
        c.setConnectionTimeout(10000);
        c.setValidationTimeout(3000);
        c.setAutoCommit(true);
        return new HikariDataSource(c);
    }

    @Bean("authDs")
    public DataSource authDs() { return pool("auth-read-only", authUser, authPassword, 2); }
    @Bean("profDs")
    public DataSource profDs() { return pool("professor-role", professorUser, professorPassword, 4); }
    @Bean("coordDs")
    public DataSource coordDs() { return pool("coordenador-role", coordUser, coordPassword, 4); }
    @Bean("authJdbc")
    public JdbcTemplate authJdbc(@Qualifier("authDs") DataSource ds) { return new JdbcTemplate(ds); }
}
