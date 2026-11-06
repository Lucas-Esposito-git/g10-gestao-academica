# Divisão de responsabilidades — G10 (4 integrantes)

**Tema:** Sistema de Gestão Acadêmica (Notas e Frequência). **Backend obrigatório:** Java 21 + Spring Boot. **Frontend escolhido neste repositório:** JavaScript Vanilla (SPA permitida pelo professor). **Banco obrigatório:** PostgreSQL 16. **Infra:** Docker Compose e PgBouncer.

> Os nomes dos integrantes podem ser preenchidos pelo grupo. A responsabilidade por cada módulo é clara, mas todos precisam conhecer a arquitetura e participar dos testes.

## Integrante 1 — Frontend e experiência do operador

**Arquivos:** `frontend/index.html`, `frontend/app.css`, `frontend/app.js`, `frontend/nginx.conf`.

**O que fazer:** testar login e logout, navegação, dashboard, cadastros de alunos/disciplinas/turmas/matrículas, formulários de notas e frequência, visibilidade por perfil; validar que dados da API aparecem corretamente e erros são tratados na tela. Conferir responsividade.

**Entregas verificáveis:** abrir SPA em `http://localhost:8080`; demonstrar o CRUD de um aluno; mostrar que as telas conversam com `/api` e que o professor não recebe ações administrativas.

**Na apresentação:** introduzir o produto, mostrar SPA e iniciar o CRUD (2 min na explicação e 1 min na demo).

## Integrante 2 — Backend Java + Spring Boot

**Arquivos:** `backend/pom.xml`, `backend/src/main/java/br/edu/g10/api/`, `backend/src/main/java/br/edu/g10/config/`, `backend/src/main/java/br/edu/g10/security/`.

**O que fazer:** testar controllers REST, autenticação JWT, autorização `@PreAuthorize`, validações das requisições, `JdbcTemplate` com PreparedStatement, transações e comunicação com procedures SQL. Conferir usuários de banco diferentes nos pools Hikari e que o `DatabaseExecutor` injeta `app.usuario_id` em cada transação.

**Entregas verificáveis:** login, `/api/auth/me`, cadastro via API, `POST /api/notas` funcionando; explicar o fluxo HTTP → controller → JDBC → PgBouncer → PostgreSQL.

**Na apresentação:** explicar Java/Spring, segurança da API, requests e demonstrar lançamento de nota (2,5 min + 1 min na demo).

## Integrante 3 — PostgreSQL: estrutura e programação SQL

**Arquivos:** `bd/backup.sql` (principalmente schemas, tabelas, seeds, function, procedure, triggers, views), `docs/modelagem.md`, `docs/sql-demonstracao.sql`.

**O que fazer:** conferir integridade das tabelas alunos/disciplinas/turmas/matrículas/notas/frequências; explicar `fn_situacao_aluno`, `sp_lancar_notas`, triggers de auditoria `audit.log_eventos` e as views `vw_boletim` e `vw_frequencia_resumo`; testar notas/frequência com valores diferentes.

**Entregas verificáveis:** consulta das 2 views; `CALL app.sp_lancar_notas(...)`; mudança de nota resultando em registro de auditoria; function exibindo média e aprovação.

**Na apresentação:** explicar os mecanismos procedurais; mostrar auditoria (3 min + 1 min demo).

## Integrante 4 — Segurança avançada do banco + Docker

**Arquivos:** `docker-compose.yml`, `pgbouncer/`, `bd/postgresql.conf`, `bd/pg_hba.conf`, definições de roles/RLS em `bd/backup.sql`, `scripts/` e `README.md`.

**O que fazer:** validar `docker compose up --build`, redes privadas e volume externo ao Git, HikariCP/PgBouncer, `statement_timeout`, `idle_in_transaction_session_timeout`, autenticação SCRAM-SHA-256 e `pg_hba.conf`; roles `rl_leitor`, `rl_escritor`, `rl_professor`, `rl_coordenador`; políticas RLS isolando professores.

**Entregas verificáveis:** `docker compose ps` com 4 serviços, `testar-rls.ps1` demonstrando 3/2/5 matrículas e bloqueio de escrita, `consultar-pool.ps1` exibindo `SHOW POOLS`, teste do timeout.

**Na apresentação:** explicar segurança e infraestrutura; demonstrar RLS, PgBouncer e timeout (2,5 min + 2 min na demo).

## Cronograma de apresentação — 15 minutos estritos

| Tempo | Responsável | Conteúdo |
|---|---|---|
| 0:00–2:00 | 1 | Objetivo, frontend e arquitetura visual |
| 2:00–4:30 | 2 | Backend, API, autenticação e JDBC |
| 4:30–7:30 | 3 | Modelagem, function, procedure, trigger e views |
| 7:30–10:00 | 4 | Docker, schemas/RBAC/RLS, PgBouncer, rede, timeouts |
| 10:00–11:00 | 1 | CRUD de aluno na SPA |
| 11:00–12:00 | 2 | Lançar nota pela procedure e mostrar média |
| 12:00–13:00 | 3 | Trigger, auditoria, views |
| 13:00–15:00 | 4 | Testes de RLS (3/2/5), PgBouncer, timeout e conclusão |

## Aceite conjunto antes de publicar

- [ ] Frontend abre e faz login de coordenador/professores.
- [ ] CRUD alunos/disciplinas e lançamento notas funcionam.
- [ ] `verificar-requisitos.ps1` lista os objetos exigidos.
- [ ] `testar-rls.ps1` valida isolamento real no PostgreSQL.
- [ ] `consultar-pool.ps1` mostra `SHOW POOLS`.
- [ ] Trigger gera auditoria e timeout cancela query lenta.
- [ ] Nenhuma pasta física de dados nem `.env` é publicada.
- [ ] README tem comandos de execução e credenciais de teste.
- [ ] Repositório está **público no GitHub** e todos ensaiaram a apresentação.

**Combinação importante:** uma pessoa cuida de cada módulo, mas os quatro devem saber responder o propósito de RBAC, RLS, prepared statements, PgBouncer, triggers, function, procedure e views. No trabalho, é mais importante comprovar os mecanismos funcionando do que criar muitas telas.
