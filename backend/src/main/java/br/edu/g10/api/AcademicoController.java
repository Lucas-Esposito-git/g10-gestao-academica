package br.edu.g10.api;

import br.edu.g10.config.DatabaseExecutor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AcademicoController {
    private final DatabaseExecutor db;
    public AcademicoController(DatabaseExecutor db) { this.db = db; }

    public record AlunoReq(@NotBlank String nome, @Email @NotBlank String email,
                           @NotBlank String matricula) {}
    public record DisciplinaReq(@NotBlank String codigo, @NotBlank String nome,
                                @Min(1) int cargaHoraria) {}
    public record TurmaReq(@NotBlank String nome, @NotNull Long disciplinaId,
                           @NotNull Long professorId, @NotBlank String periodo) {}
    public record MatriculaReq(@NotNull Long turmaId, @NotNull Long alunoId) {}
    public record NotaReq(@NotNull Long matriculaId,
                          @NotNull @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal nota1,
                          @NotNull @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal nota2) {}
    public record NotaValoresReq(@NotNull @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal nota1,
                                 @NotNull @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal nota2) {}
    public record FrequenciaReq(@NotNull Long matriculaId, @NotNull LocalDate dataAula,
                                @NotNull Boolean presente) {}
    public record FrequenciaEditReq(@NotNull LocalDate dataAula, @NotNull Boolean presente) {}

    private Map<String, Object> result(int affected) {
        if (affected == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro inexistente ou fora do seu escopo");
        return Map.of("sucesso", true, "registros", affected);
    }

    @GetMapping("/resumo")
    public Map<String, Object> resumo() {
        return db.run(j -> {
            int total = j.queryForObject("SELECT count(*) FROM app.matriculas", Integer.class);
            int aprovados = j.queryForObject("SELECT count(*) FROM app.vw_boletim WHERE situacao = 'APROVADO'", Integer.class);
            int pendentes = j.queryForObject("SELECT count(*) FROM app.vw_boletim WHERE situacao IN ('SEM NOTAS','SEM FREQUENCIA')", Integer.class);
            List<Map<String,Object>> boletim = j.queryForList(
                "SELECT * FROM app.vw_boletim ORDER BY turma, aluno LIMIT 100");
            return Map.of("matriculas", total, "aprovados", aprovados,
                "pendentes", pendentes, "boletim", boletim);
        });
    }

    @GetMapping("/alunos")
    @PreAuthorize("hasRole('COORDENADOR')")
    public List<Map<String,Object>> alunos() {
        return db.run(j -> j.queryForList("SELECT * FROM app.alunos ORDER BY id"));
    }
    @PostMapping("/alunos")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> incluirAluno(@Valid @RequestBody AlunoReq r) {
        return db.run(j -> Map.of("id", j.queryForObject(
            "INSERT INTO app.alunos(nome,email,matricula) VALUES (?,?,?) RETURNING id",
            Long.class, r.nome(), r.email(), r.matricula())));
    }
    @PutMapping("/alunos/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> editarAluno(@PathVariable long id, @Valid @RequestBody AlunoReq r) {
        return db.run(j -> result(j.update("UPDATE app.alunos SET nome=?, email=?, matricula=? WHERE id=?",
            r.nome(), r.email(), r.matricula(), id)));
    }
    @DeleteMapping("/alunos/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> excluirAluno(@PathVariable long id) {
        return db.run(j -> result(j.update("DELETE FROM app.alunos WHERE id=?", id)));
    }

    @GetMapping("/disciplinas")
    @PreAuthorize("hasRole('COORDENADOR')")
    public List<Map<String,Object>> disciplinas() {
        return db.run(j -> j.queryForList("SELECT * FROM app.disciplinas ORDER BY id"));
    }
    @PostMapping("/disciplinas")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> incluirDisciplina(@Valid @RequestBody DisciplinaReq r) {
        return db.run(j -> Map.of("id", j.queryForObject(
            "INSERT INTO app.disciplinas(codigo,nome,carga_horaria) VALUES (?,?,?) RETURNING id",
            Long.class, r.codigo(), r.nome(), r.cargaHoraria())));
    }
    @PutMapping("/disciplinas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> editarDisciplina(@PathVariable long id, @Valid @RequestBody DisciplinaReq r) {
        return db.run(j -> result(j.update(
            "UPDATE app.disciplinas SET codigo=?,nome=?,carga_horaria=? WHERE id=?",
            r.codigo(), r.nome(), r.cargaHoraria(), id)));
    }
    @DeleteMapping("/disciplinas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> excluirDisciplina(@PathVariable long id) {
        return db.run(j -> result(j.update("DELETE FROM app.disciplinas WHERE id=?", id)));
    }

    @GetMapping("/usuarios/professores")
    @PreAuthorize("hasRole('COORDENADOR')")
    public List<Map<String,Object>> professores() {
        return db.run(j -> j.queryForList(
            "SELECT id,nome FROM app.usuarios WHERE perfil='PROFESSOR' AND ativo ORDER BY nome"));
    }
    @GetMapping("/turmas")
    public List<Map<String,Object>> turmas() {
        var user = db.user();
        return db.run(j -> j.queryForList("""
            SELECT t.id, t.nome, t.disciplina_id, d.nome AS disciplina,
                   t.professor_id, u.nome AS professor, t.periodo
            FROM app.turmas t JOIN app.disciplinas d ON d.id=t.disciplina_id
            JOIN app.usuarios u ON u.id=t.professor_id
            WHERE (? = 'COORDENADOR' OR t.professor_id = ?)
            ORDER BY t.id
            """, user.perfil(), user.id()));
    }
    @PostMapping("/turmas")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> incluirTurma(@Valid @RequestBody TurmaReq r) {
        return db.run(j -> Map.of("id", j.queryForObject("""
            INSERT INTO app.turmas(nome,disciplina_id,professor_id,periodo)
            VALUES(?,?,?,?) RETURNING id
            """, Long.class, r.nome(), r.disciplinaId(), r.professorId(), r.periodo())));
    }
    @PutMapping("/turmas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> editarTurma(@PathVariable long id, @Valid @RequestBody TurmaReq r) {
        return db.run(j -> result(j.update("""
            UPDATE app.turmas SET nome=?,disciplina_id=?,professor_id=?,periodo=? WHERE id=?
            """, r.nome(), r.disciplinaId(), r.professorId(), r.periodo(), id)));
    }
    @DeleteMapping("/turmas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> excluirTurma(@PathVariable long id) {
        return db.run(j -> result(j.update("DELETE FROM app.turmas WHERE id=?", id)));
    }

    @GetMapping("/matriculas")
    public List<Map<String,Object>> matriculas() {
        return db.run(j -> j.queryForList("""
            SELECT m.id, m.turma_id, t.nome AS turma, m.aluno_id,
                   a.nome AS aluno, m.criada_em
            FROM app.matriculas m JOIN app.turmas t ON t.id=m.turma_id
            JOIN app.alunos a ON a.id=m.aluno_id ORDER BY m.id
            """));
    }
    @PostMapping("/matriculas")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> incluirMatricula(@Valid @RequestBody MatriculaReq r) {
        return db.run(j -> Map.of("id", j.queryForObject(
            "INSERT INTO app.matriculas(turma_id,aluno_id) VALUES (?,?) RETURNING id",
            Long.class, r.turmaId(), r.alunoId())));
    }
    @PutMapping("/matriculas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> editarMatricula(@PathVariable long id, @Valid @RequestBody MatriculaReq r) {
        return db.run(j -> result(j.update(
            "UPDATE app.matriculas SET turma_id=?, aluno_id=? WHERE id=?",
            r.turmaId(), r.alunoId(), id)));
    }
    @DeleteMapping("/matriculas/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> excluirMatricula(@PathVariable long id) {
        return db.run(j -> result(j.update("DELETE FROM app.matriculas WHERE id=?", id)));
    }

    @GetMapping("/notas")
    public List<Map<String,Object>> boletim() {
        return db.run(j -> j.queryForList(
            "SELECT * FROM app.vw_boletim ORDER BY matricula_id"));
    }
    @PostMapping("/notas")
    public Map<String,Object> inserirNota(@Valid @RequestBody NotaReq r) {
        return db.run(j -> { j.update("CALL app.sp_lancar_notas(?,?,?)",
            r.matriculaId(), r.nota1(), r.nota2()); return Map.of("sucesso", true); });
    }
    @PutMapping("/notas/{matriculaId}")
    public Map<String,Object> editarNota(@PathVariable long matriculaId,
                                          @Valid @RequestBody NotaValoresReq r) {
        return db.run(j -> { j.update("CALL app.sp_lancar_notas(?,?,?)",
            matriculaId, r.nota1(), r.nota2()); return Map.of("sucesso", true); });
    }
    @DeleteMapping("/notas/{matriculaId}")
    public Map<String,Object> excluirNota(@PathVariable long matriculaId) {
        return db.run(j -> result(j.update("DELETE FROM app.notas WHERE matricula_id=?", matriculaId)));
    }

    @GetMapping("/frequencias")
    public List<Map<String,Object>> frequencias() {
        return db.run(j -> j.queryForList("""
            SELECT f.id, f.matricula_id, f.data_aula, f.presente,
                   a.nome AS aluno, t.nome AS turma
            FROM app.frequencias f JOIN app.matriculas m ON m.id=f.matricula_id
            JOIN app.alunos a ON a.id=m.aluno_id
            JOIN app.turmas t ON t.id=m.turma_id
            ORDER BY f.data_aula DESC, f.id DESC
            """));
    }
    @PostMapping("/frequencias")
    public Map<String,Object> incluirFrequencia(@Valid @RequestBody FrequenciaReq r) {
        return db.run(j -> Map.of("id", j.queryForObject("""
            INSERT INTO app.frequencias(matricula_id,data_aula,presente) VALUES(?,?,?)
            ON CONFLICT(matricula_id,data_aula) DO UPDATE SET presente=EXCLUDED.presente
            RETURNING id
            """, Long.class, r.matriculaId(), r.dataAula(), r.presente())));
    }
    @PutMapping("/frequencias/{id}")
    public Map<String,Object> editarFrequencia(@PathVariable long id,
                                               @Valid @RequestBody FrequenciaEditReq r) {
        return db.run(j -> result(j.update(
            "UPDATE app.frequencias SET data_aula=?,presente=? WHERE id=?",
            r.dataAula(), r.presente(), id)));
    }
    @DeleteMapping("/frequencias/{id}")
    public Map<String,Object> excluirFrequencia(@PathVariable long id) {
        return db.run(j -> result(j.update("DELETE FROM app.frequencias WHERE id=?", id)));
    }

    @GetMapping("/frequencias/resumo")
    public List<Map<String,Object>> resumoFrequencias() {
        return db.run(j -> j.queryForList("SELECT * FROM app.vw_frequencia_resumo ORDER BY matricula_id"));
    }

    @GetMapping("/auditoria")
    @PreAuthorize("hasRole('COORDENADOR')")
    public List<Map<String,Object>> auditoria() {
        return db.run(j -> j.queryForList("""
            SELECT id,tabela,operacao,registro_id,usuario_id,role_db,
                   dados_antes,dados_depois,criado_em
            FROM audit.log_eventos ORDER BY id DESC LIMIT 80
            """));
    }

    @GetMapping("/diagnostico")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> diagnostico() {
        return db.run(j -> j.queryForMap("""
            SELECT current_user AS usuario_sql,
              inet_client_addr()::TEXT AS ip_cliente_banco,
              current_setting('statement_timeout') AS statement_timeout,
              current_setting('idle_in_transaction_session_timeout') AS idle_in_transaction_session_timeout,
              current_setting('password_encryption') AS senha_criptografia,
              current_setting('app.usuario_id', true) AS usuario_logado
            """));
    }

    @PostMapping("/diagnostico/timeout")
    @PreAuthorize("hasRole('COORDENADOR')")
    public Map<String,Object> verificarTimeout() {
        try {
            db.run(j -> { j.execute("SELECT pg_sleep(5)"); return null; });
            return Map.of("timeout_acionado", false, "detalhe", "Consulta terminou sem timeout");
        } catch (DataAccessException ex) {
            Throwable cause = ex;
            while (cause != null) {
                if (cause instanceof SQLException sql && "57014".equals(sql.getSQLState()))
                    return Map.of("timeout_acionado", true,
                        "detalhe", "PostgreSQL cancelou a query de 5 segundos (statement_timeout = 3s)");
                cause = cause.getCause();
            }
            throw ex;
        }
    }
}
