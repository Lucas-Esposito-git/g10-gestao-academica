# G10 — Sistema de Gestão Acadêmica (Notas e Frequência)

Projeto Fullstack interno (Single Tenant) desenvolvido para a atividade **Desenvolvimento de Aplicações Fullstack com Administração e Segurança Avançada no PostgreSQL**.

**Stack:** Java 21 / Spring Boot 3.5.16 / Spring JDBC / Spring Security / JavaScript SPA / Nginx / PostgreSQL 16 / PgBouncer / Docker Compose.

> **Uso educacional/local.** As credenciais abaixo são deliberadamente de demonstração. Não coloque esta configuração pública na internet. Gere senhas únicas e configure TLS, segredo JWT robusto e monitoramento antes de qualquer ambiente real.

## Arquivos para começar (equipe com 4 integrantes)

- **`G10-Divisao-de-Tarefas-4-Integrantes.pdf`**: responsabilidades de cada um, arquivos a revisar, testes e tempo de fala.
- **`G10-Guia-Instalacao-e-Execucao-Windows.pdf`**: instalação do Docker Desktop e execução para iniciantes.
- **`docs/como-rodar-windows.md`**: passo a passo ampliado, comandos e diagnóstico de erros.
- **`docs/divisao-equipe-4-pessoas.md`**: versão editável da distribuição das tarefas.
- **`docs/apresentacao-15-min.md`**: apresentação cronometrada de 10 + 5 minutos para quatro pessoas.

**O frontend desta versão é JavaScript Vanilla, não React/Next.js.** É permitido pelo enunciado. O backend é **Java com Spring Boot**, obrigatório. Para simplesmente iniciar, basta Docker Desktop; o Java e o Maven são executados dentro do build Docker.

**Validação:** verificações estáticas foram realizadas, porém o projeto ainda precisa ser iniciado e testado no Docker da máquina do grupo. Evite afirmar que os testes de integração passaram antes de executá-los.

## 1. Executar (Windows 11, Linux ou macOS)

**Pré-requisito:** Docker Desktop (Docker Engine + Compose v2) instalado e em execução. No Windows 11, utilizar o backend WSL 2 do Docker Desktop.

Abra o terminal na raiz do projeto e rode **um único comando**:

```bash
docker compose up --build
```

Após todos os serviços iniciarem, acesse **http://localhost:8080**. O primeiro build pode baixar imagens e dependências Maven. Não é necessário instalar Java, PostgreSQL, Maven ou Node.js no computador.

O comando alternativo em instalações antigas é `docker-compose up --build`.

Usuários internos de demonstração, pré-cadastrados em `bd/backup.sql`:

| Perfil | Login | Senha | Acesso |
|---|---|---|---|
| Coordenador | `coordenacao` | `Coord@123` | Todos os cadastros, notas, frequências, auditoria, diagnóstico |
| Professora Ana | `ana` | `Prof@123` | Turmas 1 e 3, suas matrículas/notas/frequências |
| Professor Bruno | `bruno` | `Prof@123` | Turma 2, suas matrículas/notas/frequências |

Para executar em segundo plano: `docker compose up -d --build`.

Para conferir o estado: `docker compose ps`.

Para acompanhar problemas: `docker compose logs -f db pgbouncer backend frontend`.

Para parar sem apagar os dados: `docker compose down`.

**Cuidado:** `docker compose down -v` apaga o volume do PostgreSQL e **todos os dados inseridos pela aplicação**. Somente use quando quiser recriar a base a partir de `backup.sql`.

## 2. Arquitetura

```text
Navegador (http://localhost:8080)
    |
    v
Frontend: Nginx + SPA em JavaScript (porta 80 -> 127.0.0.1:8080)
    | /api/ (proxy reverso, mesma origem)
    v
Backend: Java 21 + Spring Boot REST (8080 interno)
    | Spring Security: JWT Bearer + roles de aplicação
    | Spring JDBC: PreparedStatement parametrizado
    | HikariCP: pools separados por perfil SQL
    v
PgBouncer (porta 6432, transaction pooling, auth scram-sha-256)
    |
    v
PostgreSQL 16 (5432, NÃO publicado no host)
    | pg_hba.conf: permite somente IP 172.28.60.11/32
    | Schemas app e audit, roles e GRANT
    | Políticas RLS + Functions + Procedure + Triggers + 2 Views
    v
Volume Docker postgres_data (NUNCA versionado no Git)
```

**Por que há 4 contêineres se o enunciado menciona 3 serviços?** Os três serviços obrigatórios (`db`, `backend`, `frontend`) estão presentes. O quarto (`pgbouncer`) é necessário para atender ao pool de conexões PostgreSQL explicitamente exigido.

A SPA usa **JavaScript Vanilla**, expressamente permitido pelo enunciado. Não há autocadastro ou recuperação pública de senha.

### Organização do repositório

```text
G10-Gestao-Academica/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── bd/
│   ├── backup.sql             # DDL + DML + roles + seeds + objetos SQL
│   ├── postgresql.conf        # tuning + timeouts
│   └── pg_hba.conf            # allowlist de IP + SCRAM-SHA-256
├── pgbouncer/
│   ├── Dockerfile
│   ├── pgbouncer.ini
│   └── entrypoint.sh
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/br/edu/g10/
│       ├── Application.java
│       ├── api/               # autenticação, CRUD e diagnóstico
│       ├── config/            # pools, transações, segurança
│       └── security/          # JWT + filtro Bearer
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── app.css
│   └── app.js
├── scripts/
│   ├── verificar-requisitos.sh / .ps1
│   ├── testar-rls.sh / .ps1
│   └── consultar-pool.sh / .ps1
└── docs/
    ├── guia-estudo.md
    ├── apresentacao-15-min.md
    ├── checklist-avaliacao.md
    └── sql-demonstracao.sql
```

## 3. Banco de dados — atendimento aos requisitos

| Exigência do professor | Como foi implementada | Onde conferir |
|---|---|---|
| Schemas distintos | `app` (dados), `audit` (rastreabilidade) | `backup.sql` |
| AAA/RBAC e roles `rl_leitor`, `rl_escritor` | Roles NOLOGIN + GRANT de menor privilégio | `backup.sql` |
| Roles específicas G10 | `rl_professor`, `rl_coordenador` | `backup.sql` |
| Usuários SQL por perfil | `usr_auth`, `usr_professor`, `usr_coordenador`, `usr_leitor` | `backup.sql` + `DatabaseExecutor.java` |
| Pool de conexões | HikariCP (2+4+4) → PgBouncer, transaction pooling | `DataSources.java`, `pgbouncer.ini` |
| `statement_timeout` | 4s global, 3s para professor/coordenador | `postgresql.conf`, `backup.sql` |
| `idle_in_transaction_session_timeout` | 15s global, 10s para professor/coordenador | mesmos arquivos |
| IP + SCRAM-SHA-256 | Apenas IP do PgBouncer na subnet privada; autenticação SCRAM | `pg_hba.conf` |
| Prepared Statements | `JdbcTemplate` com parâmetros `?` | `AcademicoController.java` |
| Hardening de `public` (opcional) | `REVOKE CREATE ON SCHEMA public FROM PUBLIC` | `backup.sql` |
| Auditoria | Triggers em `app.notas` e `app.frequencias` → `audit.log_eventos` | `backup.sql` + tela Auditoria |
| 1 Function | `app.fn_situacao_aluno` + helpers de RLS | `backup.sql` + painel |
| 1 Procedure | `app.sp_lancar_notas` | `backup.sql` + tela Notas |
| 1 Trigger | `trg_auditar_notas` e `trg_auditar_frequencias` | `backup.sql` |
| 2 Views | `app.vw_boletim`, `app.vw_frequencia_resumo` | `backup.sql` + SPA |
| RLS em tabela sensível | `app.matriculas`, `app.notas`, `app.frequencias` | `backup.sql` + `testar-rls.sh` |
| SQL inicial + Seeds | `bd/backup.sql`, instalado na criação do volume | `docker-compose.yml` |

**Extra:** senhas dos operadores são hashes BCrypt, gerados por `pgcrypto`. As consultas usam parâmetros no JDBC (evitam interpolação de dados SQL). A opção JDBC `prepareThreshold=0` **desabilita somente prepared statements nomeados mantidos no servidor**, evitando incompatibilidades com transaction pooling; não elimina o uso de `PreparedStatement` parametrizado no JDBC.

### O mecanismo RLS do G10

Quando a professora Ana entra na SPA:

1. O servidor valida a senha BCrypt e emite um token JWT de 2 horas.
2. A API valida o JWT e identifica o perfil `PROFESSOR` e o ID 2.
3. `DatabaseExecutor` seleciona o pool autenticado no banco como **`usr_professor`**.
4. Dentro de uma transação Spring, chama `set_config('app.usuario_id', '2', true)`.
5. A política RLS de `app.matriculas` deixa visíveis apenas as turmas atribuídas ao ID 2. As tabelas `notas` e `frequencias` dependem desse mesmo isolamento.
6. Uma tentativa de alterar a matrícula de outro professor é rejeitada **pelo próprio PostgreSQL**.
7. Ao final da transação, `SET LOCAL` é descartado automaticamente, evitando vazamento de identidade entre conexões reutilizadas pelo PgBouncer.

O coordenador conecta ao banco pelo usuário SQL `usr_coordenador` e possui permissão para ver e editar todos os registros.

**Views seguras:** `security_invoker = true` evita que uma view criada por `postgres` contorne a RLS ao ser consultada pelos perfis da aplicação.

## 4. Testes práticos para a banca

No terminal, dentro da raiz:

```bash
sh scripts/verificar-requisitos.sh
sh scripts/testar-rls.sh
sh scripts/consultar-pool.sh
```

**No Windows 11 (PowerShell)**, use as versões equivalentes sem instalar Bash:

```powershell
.\scripts\verificar-requisitos.ps1
.\scripts\testar-rls.ps1
.\scripts\consultar-pool.ps1
```

Caso a política de execução do PowerShell bloqueie scripts, use o terminal Git Bash e os comandos `sh` mostrados acima.

Os scripts utilizam `docker compose exec` e precisam do projeto em execução.

- **`verificar-requisitos.sh`** lista schemas, roles, views, functions, procedure, triggers, RLS, `pg_hba.conf`, timeouts e boletim.
- **`testar-rls.sh`** verifica 3 matrículas para Ana, 2 para Bruno, 5 para coordenação e prova que Ana não consegue alterar nota de Bruno.
- **`consultar-pool.sh`** executa `SHOW POOLS` no painel administrativo do PgBouncer, via cliente `psql` dentro do contêiner `db`.

Para observar a auditoria na interface: entre como coordenador, acesse **Notas e boletim**, modifique a nota de uma matrícula e depois abra **Auditoria**. Aparecerá um registro `UPDATE` com `dados_antes`, `dados_depois`, `usuario_id` e `role_db`.

Para provar os timeouts: entre como coordenador e abra **PostgreSQL / RLS**, clique em **Executar teste do timeout**. A consulta `SELECT pg_sleep(5)` deve ser cancelada pela configuração de 3 segundos do usuário SQL (SQLSTATE `57014`). O teste também pode ser feito diretamente via SQL.

> **Importante:** `pg_isready` e os healthchecks verificam disponibilidade, mas não substituem uma execução real dos testes acima. Execute tudo na sua máquina antes da apresentação.

## 5. API REST

| Método | Endpoint | Quem usa | O que faz |
|---|---|---|---|
| POST | `/api/auth/login` | Livre (login interno) | Valida credencial seed e retorna JWT |
| GET | `/api/auth/me` | Autenticado | Dados do operador |
| GET | `/api/resumo` | Ambos | Indicadores + boletim |
| GET, POST, PUT, DELETE | `/api/alunos` | Coordenador | CRUD (PUT/DELETE com `/{id}`) |
| GET, POST, PUT, DELETE | `/api/disciplinas` | Coordenador | CRUD |
| GET | `/api/usuarios/professores` | Coordenador | Professores disponíveis |
| GET | `/api/turmas` | Ambos (filtra docente) | Consulta turmas |
| POST, PUT, DELETE | `/api/turmas` | Coordenador | CRUD |
| GET | `/api/matriculas` | Ambos (RLS) | Lista matrículas visíveis |
| POST, PUT, DELETE | `/api/matriculas` | Coordenador | CRUD |
| GET | `/api/notas` | Ambos (RLS) | View do boletim |
| POST, PUT, DELETE | `/api/notas` | Ambos (RLS) | Grava via procedure, remove nota |
| GET, POST, PUT, DELETE | `/api/frequencias` | Ambos (RLS) | Frequência; UPSERT no POST |
| GET | `/api/frequencias/resumo` | Ambos | View da frequência |
| GET | `/api/auditoria` | Coordenador | Logs de auditoria |
| GET | `/api/diagnostico` | Coordenador | Configurações do servidor SQL |
| POST | `/api/diagnostico/timeout` | Coordenador | Valida statement_timeout |

**Exemplo de payload para lançar notas:**

```json
{"matriculaId":1,"nota1":8.5,"nota2":9.0}
```

O retorno de notas e frequências já é filtrado pela RLS com o operador da requisição. `403` significa acesso proibido pelo Spring Security; uma operação SQL indevida também pode ser recusada pelo PostgreSQL.

## 6. Segurança e melhorias para produção

Esta entrega usa arquitetura correta para a **demonstração acadêmica**, mas não é uma implantação de produção. Para publicar na internet seria necessário substituir segredos padrão e autenticação de laboratório, usar HTTPS/TLS entre serviços, revogação/rotação de tokens, rate limit no login, monitoramento e backups/restauração testados, e restringir também o tráfego ao PgBouncer com segmentação de rede/ACL. As roles SQL de professor e coordenador são distintas; a identificação individual dos professores depende do contexto de transação validado pela API, então credenciais de banco jamais devem ser distribuídas aos operadores.

O arquivo `backup.sql` é uma **carga inicial / seed**, conforme nome solicitado pelo professor; não é uma rotina de backup periódico. O volume nomeado fica fora do repositório Git. Em um projeto real, manter backup automático com `pg_dump`/PITR e testes de recuperação.

Se mudar a DDL/roles/seeds em `backup.sql` depois do primeiro boot, o PostgreSQL não executa o script novamente enquanto existir volume. Para reinicializar um ambiente de testes, use `docker compose down -v` (perde todos os registros) e `docker compose up --build`.

## 7. Divisão recomendada da equipe

Grupo com 4 alunos: (1) Docker, PgBouncer e configurações; (2) modelagem, roles/RLS, procedure e auditoria; (3) Spring Boot, segurança e integração SQL; (4) frontend, validação, testes e apresentação. Com 5 alunos: reservar uma pessoa só para testes de segurança, documentação e demonstração.

## 8. Fontes técnicas

- PostgreSQL 16 — RLS: https://www.postgresql.org/docs/16/ddl-rowsecurity.html
- PostgreSQL 16 — CREATE POLICY: https://www.postgresql.org/docs/16/sql-createpolicy.html
- PostgreSQL 16 — parâmetros de configuração: https://www.postgresql.org/docs/16/runtime-config-file-locations.html
- PgBouncer — configuração e SCRAM: https://www.pgbouncer.org/config
- PgBouncer — prepared statements / JDBC: https://www.pgbouncer.org/faq.html
- Spring Boot 3.5 — documentação: https://docs.spring.io/spring-boot/3.5/

## 9. Publicar no GitHub (entregável final)

1. Entre em https://github.com/new e crie um repositório **Public**, por exemplo `g10-gestao-academica`. Não marque a criação de README automático porque ele já existe no projeto.
2. Na pasta extraída do ZIP, abra o terminal e execute (substitua **SEU-USUARIO**):

```bash
git init
git add .
git commit -m "feat: sistema G10 fullstack com seguranca PostgreSQL"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/g10-gestao-academica.git
git push -u origin main
```

3. Abra o link público e verifique se contém `docker-compose.yml`, `backend/`, `frontend/`, `bd/`, `README.md` e **não contém** a pasta física do PostgreSQL nem `.env`.
4. Entregue ao professor a URL do seu repositório público. Este arquivo ZIP ainda **não** equivale a um repositório publicado no GitHub.

**Documentos complementares:** `docs/guia-estudo.md`, `docs/modelagem.md`, `docs/apresentacao-15-min.md`, `docs/checklist-avaliacao.md`.
