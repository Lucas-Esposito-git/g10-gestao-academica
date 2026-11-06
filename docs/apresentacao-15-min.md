# Apresentação G10 — Roteiro cronometrado para 4 integrantes

**Tempo total estrito:** 10 minutos para explicar a arquitetura/configurações + 5 minutos para demonstrar o sistema.

## Parte 1 — Explicação técnica (0:00 a 10:00)

### Integrante 1 | 0:00 a 2:00 — Objetivo e frontend

“Nosso grupo desenvolveu o G10, um sistema interno de notas e frequência. O coordenador cadastra alunos, disciplinas, turmas e matrículas; o professor lança notas e faltas. O frontend é uma SPA em JavaScript, servida pelo Nginx. A interface se comunica com uma API REST em Java/Spring Boot.”

**Mostrar:** tela inicial e painel; estrutura `frontend/` e `docker-compose.yml` brevemente. Citar Single Tenant, usuários seed e ausência de autocadastro.

### Integrante 2 | 2:00 a 4:30 — Spring Boot e API

“A API Spring Boot contém controllers REST para CRUD e autenticação por JWT. Usamos `@PreAuthorize` para operações administrativas. Com `JdbcTemplate` enviamos SQL parametrizado, sem concatenar entradas em consultas. O `DatabaseExecutor` escolhe o usuário SQL de professor ou coordenador e registra a identidade do operador dentro da transação.”

**Mostrar:** `AcademicoController`, `AuthController`, `DataSources`, `DatabaseExecutor` e um endpoint.

### Integrante 3 | 4:30 a 7:30 — Banco, funções e auditoria

“O banco tem os schemas `app` e `audit`. A function `fn_situacao_aluno` calcula média, percentual de frequência e situação. A procedure `sp_lancar_notas` grava ou atualiza notas. Triggers de notas e frequências criam logs de auditoria, com antes e depois. Duas views ativas alimentam o boletim e o resumo de frequência.”

**Mostrar:** `bd/backup.sql`, os `CREATE FUNCTION`, `CREATE PROCEDURE`, `CREATE TRIGGER`, `CREATE VIEW` e tabela de auditoria.

### Integrante 4 | 7:30 a 10:00 — Administração, segurança e Docker

“Tudo sobe com `docker compose up --build`: frontend, backend, PostgreSQL e o quarto serviço PgBouncer exigido para conexão. Criamos roles `rl_leitor`, `rl_escritor`, `rl_professor`, `rl_coordenador`, timeouts, restrição por IP no `pg_hba.conf` com SCRAM-SHA-256 e RLS em matrículas, notas e frequência. A RLS garante isolamento por professor mesmo quando o backend consulta o banco.”

**Mostrar:** `docker-compose.yml`, `postgresql.conf`, `pg_hba.conf`, `pgbouncer.ini`, `CREATE POLICY` e `GRANT`.

## Parte 2 — Demonstração real (10:00 a 15:00)

### Integrante 1 | 10:00 a 11:00 — CRUD frontend

Login `coordenacao / Coord@123`, abrir **Alunos**, criar “Teste Banca” (`teste@exemplo.test`, `2026999`) e editar seu nome. Mostrar listagem atualizada.

### Integrante 2 | 11:00 a 12:00 — Integração Spring + procedure

Abrir **Notas e boletim**, editar notas da matrícula 1 para `7` e `9`; mostrar média `8.00` e explicar `CALL app.sp_lancar_notas` disparado pelo Spring.

### Integrante 3 | 12:00 a 13:00 — Trigger/Views

Abrir **Auditoria**, localizar `UPDATE` em `app.notas`, expandir JSON antes/depois. Apontar view do boletim e view do resumo de frequência.

### Integrante 4 | 13:00 a 15:00 — RLS, pool e timeout

No PowerShell, executar `./scripts/testar-rls.ps1` (Ana = 3, Bruno = 2, coordenação = 5 e bloqueio de escrita indevida); executar `./scripts/consultar-pool.ps1` (`SHOW POOLS`). Na SPA, **PostgreSQL / RLS**, clicar no teste de timeout (`pg_sleep(5)` cancelado após 3s). Encerrar com uma frase.

## Preparação para evitar problemas

1. Um dia antes, execute `docker compose up -d --build` com internet e rode os três scripts PowerShell de validação.
2. Deixe site e PowerShell abertos; aumente o zoom do terminal para a banca enxergar resultados.
3. Teste a senha do coordenador, a edição de notas e a auditoria antes de começar.
4. Não execute `docker compose down -v` antes da apresentação, pois apaga o volume.
5. Não declare que RLS/timeouts funcionaram apenas porque os arquivos SQL existem; mostre os testes executados.
6. Combine com os colegas a passagem de fala para não ultrapassar os 10 minutos antes da demo.
