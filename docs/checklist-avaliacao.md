# Checklist de conformidade — G10

## Requisitos do enunciado

- [x] Tema G10: Gestão Acadêmica (Notas e Frequência)
- [x] API REST Java + Spring Boot
- [x] SPA em JavaScript Vanilla (permitido no edital)
- [x] PostgreSQL 16
- [x] Docker Compose: `db`, `backend`, `frontend` (+ `pgbouncer`)
- [x] Inicialização com um único comando `docker compose up --build`
- [x] Interno / Single Tenant; contas pré-cadastradas, sem cadastro público
- [x] CRUD alunos, disciplinas, turmas e matrículas, além de notas e frequência
- [x] Schemas `app`, `audit`
- [x] Roles `rl_leitor`, `rl_escritor` (AAA/RBAC)
- [x] Roles `rl_professor`, `rl_coordenador` específicas do G10
- [x] 3 pools Hikari separados + PgBouncer transaction pooling
- [x] `statement_timeout`
- [x] `idle_in_transaction_session_timeout`
- [x] `pg_hba.conf` limita IP do PgBouncer (172.28.60.11/32)
- [x] `scram-sha-256` no servidor e PgBouncer
- [x] Prepared Statements via `JdbcTemplate` e parâmetros
- [x] Hardening do schema `public` (item opcional)
- [x] Triggers de auditoria de notas e frequências
- [x] Function `app.fn_situacao_aluno`
- [x] Procedure `app.sp_lancar_notas`
- [x] Pelo menos 1 trigger (há 2)
- [x] Pelo menos 2 views (`vw_boletim`, `vw_frequencia_resumo`)
- [x] RLS em tabelas sensíveis (`matriculas`, `notas`, `frequencias`)
- [x] `bd/postgresql.conf`, `bd/pg_hba.conf`, `bd/backup.sql`
- [x] `.gitignore` exclui diretórios de dados físicos
- [x] README com comandos e credenciais de teste
- [x] Roteiro de 10 minutos de explicação + 5 de demonstração

## Validação real necessária no seu computador

- [ ] Executar `docker compose up --build` e confirmar 4 serviços ativos.
- [ ] Abrir http://localhost:8080 e entrar como coordenador.
- [ ] Cadastrar/editar aluno e confirmar na listagem.
- [ ] Lançar nota pela tela e confirmar mudança na view.
- [ ] Confirmar que a auditoria recebeu INSERT/UPDATE com JSON antes/depois.
- [ ] Executar `sh scripts/verificar-requisitos.sh` sem erro.
- [ ] Executar `sh scripts/testar-rls.sh` com três verificações de contagem e bloqueio de escrita indevida.
- [ ] Executar `sh scripts/consultar-pool.sh` e mostrar `SHOW POOLS`.
- [ ] Executar teste de timeout na SPA e confirmar cancelamento.
- [ ] Executar `docker compose logs backend` e conferir ausência de exceções inesperadas.
- [ ] Criar repositório GitHub **público** e enviar os arquivos (sem `.env`/volume físico).
- [ ] Fazer ensaio de apresentação com cronômetro.

> As caixas marcadas indicam implementação prevista no código-fonte. As caixas vazias dependem da execução efetiva no Docker, da publicação no GitHub e da banca. Não afirmar que foram concluídas sem testar.
