# Guia de estudo — Entenda e defenda o G10

## 1. Como explicar o projeto em 30 segundos

> Nosso grupo desenvolveu um sistema interno de gestão acadêmica que controla alunos, disciplinas, turmas, matrículas, notas e frequência. O frontend em JavaScript chama uma API REST em Spring Boot. O backend utiliza HikariCP e conecta ao PostgreSQL 16 através do PgBouncer, tudo no Docker Compose. O destaque é a segurança do banco: roles específicas, Row-Level Security para docentes, auditoria automática com triggers, procedure de notas, function de aprovação, duas views e limites de timeout.

## 2. Caminho completo de um lançamento de nota

Imagine que Ana vai lançar a nota da matrícula 1:

1. **Tela:** navegador envia `POST /api/notas` com `{"matriculaId":1,"nota1":8.5,"nota2":9}`.
2. **Autenticação:** backend verifica assinatura e validade do JWT recebido no header `Authorization: Bearer ...`.
3. **RBAC na API:** o usuário autenticado tem perfil `PROFESSOR` e pode chamar a rota de notas.
4. **Credencial no banco:** `DatabaseExecutor` escolhe o pool Hikari autenticado como `usr_professor`. Não usa a credencial administrativa `postgres`.
5. **Transação:** a aplicação inicia uma transação e executa `SELECT set_config('app.usuario_id', '2', true)`.
6. **RLS:** PostgreSQL verifica se a matrícula 1 pertence a uma turma da professora de ID 2. Se não pertencer, o INSERT/UPDATE é bloqueado no banco.
7. **Procedure:** `CALL app.sp_lancar_notas(1,8.5,9)` grava ou atualiza as notas e a data da atualização.
8. **Trigger:** `trg_auditar_notas` executa `audit.fn_auditar_alteracao()` e grava o antes/depois em `audit.log_eventos`.
9. **Function:** a view `vw_boletim` usa `fn_situacao_aluno(1)` para calcular a média, a frequência e a situação.
10. **Frontend:** o painel apresenta a situação atualizada ao professor.

**Por que tantas camadas?** A API impede acesso não autorizado; as roles SQL limitam o que cada credencial pode fazer; a RLS restringe os registros visíveis, mesmo se alguém errar um filtro em uma consulta.

## 3. Conceitos que a banca pode perguntar

### O que é Single Tenant?

Uma única organização utiliza a aplicação, que não permite autocadastro público. Os operadores e administradores já existem no banco desde a inicialização. **Single Tenant não significa que todos podem ver todos os dados**: a RLS restringe matrículas dos professores.

### Qual a diferença entre role de aplicação e role do PostgreSQL?

- A role de **aplicação** é `PROFESSOR` ou `COORDENADOR`, presente no JWT e validada pelo Spring Security.
- A role **SQL** é uma conta técnica (`usr_professor` ou `usr_coordenador`) com permissões PostgreSQL concedidas por `GRANT rl_professor` / `GRANT rl_coordenador`.
- As roles `rl_leitor` e `rl_escritor` são agrupamentos de privilégios herdados pelas demais. A `usr_auth` só consulta a tabela de usuários no login.
- O sistema aplica **as duas**: rotas e autorizações no Java, restrições SQL no PostgreSQL.

### O que é RLS?

Row-Level Security permite aplicar um `WHERE` obrigatório no **próprio SGBD** a cada operação sobre uma tabela. Ex.: uma nota pertence a uma matrícula; a matrícula está associada a uma turma; a turma possui professor responsável. Se o professor logado não é o responsável, a linha fica invisível ou não pode ser modificada.

### Por que a RLS usa `set_config(..., true)`?

O último argumento `true` torna a configuração **local à transação**. Como PgBouncer reutiliza conexões, gravar a identidade como configuração de sessão permanente poderia contaminar a requisição de outro usuário. O código executa `set_config` e todo o SQL da requisição dentro da mesma transação.

### Por que `security_invoker = true` nas views?

Views normalmente usam privilégios do proprietário. Como a nossa inicialização é criada por `postgres`, uma view tradicional poderia ignorar a RLS. Com `security_invoker`, o PostgreSQL usa as permissões e políticas do usuário SQL que consultou a view.

### O que faz a Function?

`app.fn_situacao_aluno(p_matricula_id)` recebe a matrícula e calcula a média das duas notas e o percentual de presenças. Retorna `APROVADO` para média >= 6 e frequência >= 75%; `REPROVADO` caso contrário; e estados `SEM NOTAS` / `SEM FREQUENCIA` quando faltam lançamentos. **Esse é um critério escolhido para a demonstração, não uma regra acadêmica universal.**

### O que faz a Procedure?

`app.sp_lancar_notas` recebe matrícula, nota 1 e nota 2. Valida o intervalo 0–10 e faz `INSERT ... ON CONFLICT DO UPDATE` (UPSERT). **Não usamos `COMMIT` dentro dela**, porque o Spring controla a transação e mantém `SET LOCAL` válido até o final. Em PostgreSQL, tentar `COMMIT` dentro de uma procedure chamada em transação explícita gera erro.

### O que é Trigger?

É um gatilho executado automaticamente pelo banco quando ocorre INSERT, UPDATE ou DELETE. Os triggers de notas e frequências gravam JSON do valor anterior e do novo valor, o ID do operador, o usuário SQL e a data do evento, na tabela `audit.log_eventos`.

### Por que duas views?

`app.vw_boletim` junta alunos, turmas, disciplinas, notas e a função de situação. `app.vw_frequencia_resumo` agrega aulas, presenças, faltas e percentual. As views simplificam as consultas e mantêm o cálculo centralizado no banco.

### O que é PgBouncer? E HikariCP?

**HikariCP** é o pool do lado Java, que reutiliza conexões para a aplicação. **PgBouncer** é um proxy entre o Java e PostgreSQL, que reutiliza conexões com o servidor e reduz pressão na criação de sessões. Nosso modo é `transaction pooling`: uma conexão de servidor é vinculada somente durante a transação.

`prepareThreshold=0` no JDBC impede **prepared statements nomeados persistentes no servidor** que podem entrar em conflito com o transaction pooling. O código continua usando JDBC parametrizado via `JdbcTemplate` e `?` para valores, protegendo contra SQL Injection por concatenação de entradas.

### O que é SCRAM-SHA-256?

Mecanismo de autenticação para conexões ao PostgreSQL, mais robusto que o legado MD5. Configuramos `password_encryption = 'scram-sha-256'`, regras `scram-sha-256` no `pg_hba.conf`, e `auth_type = scram-sha-256` no PgBouncer.

### Qual a diferença de statement_timeout e idle_in_transaction_session_timeout?

`statement_timeout` cancela uma **query que demora demais**. O banco usa 4s global e 3s no usuário SQL do sistema. `idle_in_transaction_session_timeout` encerra uma **sessão que ficou parada com uma transação aberta**, usando 15s global e 10s nas roles de acesso. Uma requisição parada dentro de uma transação é perigosa porque mantém locks e recursos ocupados.

### O que foi configurado em pg_hba.conf?

A única conexão TCP aceita para o PostgreSQL é do endereço `172.28.60.11/32`, que é o serviço PgBouncer no Docker. Regras finais rejeitam todos os outros IPs e IPv6. O banco não tem porta `5432` exposta no computador do aluno; somente o site em `127.0.0.1:8080` é exposto.

### O que é SQL Injection e como foi evitado?

Ataque que tenta alterar um comando SQL enviando dados maliciosos. Ex.: no login, uma tentativa de usar `' OR 1=1 --` será tratada como **texto de login** e não como parte do SQL, pois `JdbcTemplate` envia os parâmetros por PreparedStatement.

### O que é AAA e RBAC?

AAA envolve autenticação, autorização e auditoria/accounting. Nosso projeto tem autenticação com usuário/senha + JWT; autorização com Spring Security, roles do PostgreSQL e RLS; rastreabilidade com triggers e logs. RBAC é controle por **papel**: professor não pode excluir disciplina e coordenador pode.

## 4. Entendendo a arquitetura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `docker-compose.yml` | Criar a rede, volumes, quatro serviços e dependências/healthchecks |
| `bd/backup.sql` | Criar schemas, tabelas, roles, RLS, function, procedure, triggers, views e seeds |
| `bd/postgresql.conf` | Definir timeout, logs, conexões e otimizações |
| `bd/pg_hba.conf` | Restringir o IP de quem pode conectar no PostgreSQL |
| `pgbouncer/pgbouncer.ini` | Configurar o pool do PgBouncer e autenticação SCRAM |
| `DataSources.java` | Configurar 3 pools Hikari distintos (auth, professor, coordenador) |
| `DatabaseExecutor.java` | Escolher role SQL por operador e aplicar identidade apenas na transação |
| `AuthController.java` | Login com BCrypt e geração do JWT |
| `SecurityConfig.java`, `BearerFilter.java` | Verificar tokens, rotas e roles no backend |
| `AcademicoController.java` | Endpoints CRUD e de diagnóstico, usando SQL parametrizado |
| `frontend/app.js` | Requisições à API e interação nas telas sem recarregar página |
| `frontend/nginx.conf` | Servir a SPA e encaminhar `/api` ao backend |

## 5. Exercício para você aprender a explicar sozinho

**Situação A:** a professora Ana tenta lançar 10 na matrícula 3, cuja turma é do professor Bruno. Qual camada bloqueia?

**Resposta:** PostgreSQL via RLS de `app.notas`, baseada na RLS de `app.matriculas`, que confere se o docente responsável é o professor ID 2. A API nem precisa implementar filtro em todos os SQLs para obter essa proteção adicional.

**Situação B:** um usuário autenticado como professor tenta `DELETE /api/disciplinas/1`. O que acontece?

**Resposta:** Spring Security recusa por `@PreAuthorize("hasRole('COORDENADOR')")`. A credencial SQL de professor também não recebe DELETE na tabela disciplinas.

**Situação C:** alguém lança uma frequência, depois altera de presença para falta. Como explicar a prova de auditoria?

**Resposta:** as operações ativam o trigger da tabela `app.frequencias`, que gera registros `INSERT` e `UPDATE` na tabela `audit.log_eventos`. O coordenador consulta os JSONs antes/depois na tela Auditoria.

**Situação D:** o docente pergunta por que o SQL precisa de `BEGIN/COMMIT` no serviço, e não na procedure.

**Resposta:** `DatabaseExecutor` faz a requisição em uma transação única, e a identidade é aplicada com `SET LOCAL`. A procedure não pode finalizar a transação da aplicação, pois isso quebraria esse contexto e o pooling.

## 6. Pontos que não devem ser exagerados na apresentação

- Não afirmar que o sistema está pronto para produção: o projeto usa credenciais de teste intencionalmente.
- Não chamar o arquivo `backup.sql` de backup automático contínuo; é carga inicial requerida no enunciado.
- Não afirmar que o RLS dispensa autorização na API ou gerenciamento de credenciais.
- Não afirmar que o timeout demonstra um teste de carga; ele demonstra limite de execução. Uma prova de throughput/conexões é outra coisa.
- Não afirmar que senhas de banco usadas pelo PgBouncer são todas armazenadas cifradas no `userlist.txt`: nesta demonstração o arquivo temporário contém senhas simples para o proxy autenticar contra o PostgreSQL por SCRAM. Não é versionado.

## 7. Referência rápida de comandos

```bash
# Iniciar todo o ambiente (um comando)
docker compose up --build

# Abrir o site no navegador
# http://localhost:8080

# Conferir se os serviços estão funcionando
docker compose ps

# Testar recursos de banco
sh scripts/verificar-requisitos.sh

# Provar RLS e bloqueio de escrita de outra turma
sh scripts/testar-rls.sh

# Consultar conexões no PgBouncer
sh scripts/consultar-pool.sh

# Observar logs dos serviços
docker compose logs -f backend db pgbouncer

# Encerrar sem destruir os dados
docker compose down
```
