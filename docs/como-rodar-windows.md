# Guia passo a passo - Executar o G10 no Windows 11

Este manual é para quem nunca configurou Docker, Java, Spring Boot e PostgreSQL. O projeto é **Java 21 + Spring Boot 3.5.16 no backend**, **JavaScript Vanilla SPA no frontend**, PostgreSQL 16 e PgBouncer. JavaScript Vanilla é permitido pelo professor; não precisa trocar para React/Next.js.

## 1. O que realmente precisa instalar?

**Obrigatório para executar a versão completa:** Docker Desktop com Docker Compose. O Docker compila o Java usando Maven dentro de um contêiner e executa o PostgreSQL em outro. Por isso, **não precisa instalar Java, Maven, PostgreSQL nem Node.js na máquina para simplesmente rodar o projeto**.

**Recomendado para desenvolver:** VS Code (ou IntelliJ IDEA), Git, JDK 21 e Maven 3.9+ (Maven é dispensável se usar Maven em contêiner). Para editar o frontend basta um editor: este projeto usa JavaScript e HTML, sem `npm install`.

## 2. Preparar Docker Desktop (fazer uma vez)

1. Abra **PowerShell como administrador**. Verifique o WSL:
   ```powershell
   wsl --status
   ```
2. Se o Windows disser que o WSL não está instalado, rode:
   ```powershell
   wsl --install
   ```
   Reinicie o Windows se solicitado. Se já estiver instalado, não repita.
3. Instale Docker Desktop pelo site oficial: https://www.docker.com/products/docker-desktop/ . Prefira o backend **WSL 2** / Linux containers. Ative virtualização na BIOS se o Docker pedir.
4. Abra Docker Desktop e espere o serviço ficar pronto. Em um PowerShell **normal**, rode:
   ```powershell
   docker --version
   docker compose version
   docker info
   ```
   Se `docker info` falhar com mensagem sobre daemon/engine, abra Docker Desktop primeiro.

Documentação oficial: https://docs.docker.com/desktop/setup/install/windows-install/ e https://docs.docker.com/desktop/features/wsl/ .

## 3. Extrair o projeto e abrir na pasta certa

1. Extraia `G10-Gestao-Academica-Projeto-Completo.zip` usando **Extrair tudo**.
2. Entre na pasta `G10-Gestao-Academica` (a que contém `docker-compose.yml`).
3. Clique na barra de endereço do Explorador, digite `powershell` e tecle Enter. O terminal deve abrir nessa pasta.
4. Para conferir a localização e os arquivos:
   ```powershell
   pwd
   dir
   ```
   Você deve ver `docker-compose.yml`, `backend`, `frontend`, `bd` e `pgbouncer`.

## 4. Rodar tudo com um comando

```powershell
docker compose up --build
```

**O que esse comando faz:**
- `db`: baixa PostgreSQL 16, cria as tabelas e executa `bd/backup.sql` **somente na primeira inicialização do volume**.
- `pgbouncer`: configura o pool de conexões exigido pelo professor.
- `backend`: compila Java 21/Spring Boot com Maven dentro da imagem Docker; inicia API REST.
- `frontend`: inicia Nginx e serve as telas HTML/CSS/JS; também encaminha `/api` ao Spring Boot.

O primeiro build precisa de internet para baixar imagens e dependências. **Não feche o terminal enquanto estiver usando `up` sem `-d`**. Para rodar em segundo plano, use `docker compose up -d --build`.

Em outra janela do PowerShell, acompanhe o resultado:
```powershell
docker compose ps
```

O esperado são 4 serviços: `db`, `pgbouncer`, `backend`, `frontend`. O backend e db/pgbouncer devem indicar `healthy` após inicializar. Se aparecer `unhealthy` ou `exited`, veja a seção Problemas.

## 5. Abrir o sistema e fazer o primeiro login

Abra no navegador: **http://localhost:8080**.

| Perfil | Login | Senha |
|---|---|---|
| Coordenador | `coordenacao` | `Coord@123` |
| Professora Ana | `ana` | `Prof@123` |
| Professor Bruno | `bruno` | `Prof@123` |

Esses usuários são *seeds* criados no SQL inicial. Use apenas em laboratório; não publique com essas credenciais em ambiente de produção.

## 6. Primeiro teste de funcionamento (5 minutos)

1. Entre como `coordenacao`.
2. Abra **Alunos**; cadastre um aluno de teste; edite o nome dele; confirme a alteração na tabela.
3. Abra **Notas e boletim**, altere a nota da matrícula 1; o backend chama a **procedure `app.sp_lancar_notas`** e a função SQL recalcula a média.
4. Abra **Auditoria**: o trigger deve ter registrado o UPDATE de nota com valores antes/depois.
5. Abra **PostgreSQL / RLS** e use o teste de `statement_timeout`; a consulta de 5 segundos deve ser cancelada.
6. Teste também com `ana` e `bruno`. Cada professor deve enxergar somente as matrículas das turmas sob sua responsabilidade.

## 7. Rodar os três testes do professor no PowerShell

Na raiz do projeto, com Docker ligado:
```powershell
.\scripts\verificar-requisitos.ps1
.\scripts\testar-rls.ps1
.\scripts\consultar-pool.ps1
```

- O primeiro lista roles, schemas, views, triggers, policies e timeouts.
- O segundo comprova RLS: Ana **3**, Bruno **2**, coordenação **5** matrículas e bloqueio na escrita cruzada.
- O terceiro consulta `SHOW POOLS` para comprovar PgBouncer.

Se PowerShell bloquear `.ps1` por política de execução, **não altere a política global do computador**. Execute individualmente em uma sessão com:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verificar-requisitos.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar-rls.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\consultar-pool.ps1
```

## 8. Comandos do Docker que você precisa aprender

| Comando (na raiz) | Para que serve |
|---|---|
| `docker compose up --build` | Compila as imagens e sobe os serviços na tela |
| `docker compose up -d --build` | Faz o mesmo em segundo plano |
| `docker compose ps` | Lista contêineres e estado |
| `docker compose logs -f backend` | Lê mensagens do Spring Boot |
| `docker compose logs -f db` | Lê mensagens do PostgreSQL |
| `docker compose restart backend` | Reinicia apenas a API |
| `docker compose down` | Para os serviços mantendo os dados |
| `docker compose down -v` | **APAGA os dados** e o volume; use somente para zerar o laboratório |

## 9. Aprender onde fica o Java e como alterar o backend

O backend está em `backend/src/main/java/br/edu/g10/`:
- `Application.java`: inicia o Spring Boot.
- `api/AcademicoController.java`: endpoints REST (GET, POST, PUT, DELETE) de alunos, notas e frequência.
- `api/AuthController.java`: login dos usuários internos.
- `config/DatabaseExecutor.java`: escolhe a role SQL e define a identidade dentro da transação (RLS).
- `config/DataSources.java`: cria pools HikariCP para usuários de banco diferentes.
- `security/`: token de autenticação JWT e filtro de segurança.

**Exemplo do fluxo:** tela cadastra aluno → `POST /api/alunos` → controller Java recebe dados → `JdbcTemplate` prepara SQL parametrizado → PgBouncer → PostgreSQL grava → API devolve JSON → frontend mostra novo aluno.

Para editar Java: abra a pasta no VS Code com extensão Java ou no IntelliJ, altere um controller e execute novamente `docker compose up -d --build backend`; aguarde ficar `healthy` e atualize o navegador. Docker recompila o backend na imagem; não é hot reload.

### Java/Maven sem Docker (opcional, para estudar)

Instale JDK 21 e Maven 3.9+ no Windows, configure `JAVA_HOME`/`PATH` e confirme:
```powershell
java -version
mvn -version
```

Para apenas compilar e testar o backend (sem rodar o sistema):
```powershell
cd backend
mvn test
mvn package
cd ..
```

Se quiser **executar a API Java fora do Docker**, use o arquivo `docker-compose.dev.yml` incluído no projeto (expõe PgBouncer **somente em 127.0.0.1**):
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db pgbouncer
$env:DB_JDBC_URL='jdbc:postgresql://localhost:6432/academico?prepareThreshold=0'
cd backend
mvn spring-boot:run
```

A API estará em http://localhost:8080/actuator/health , mas **a SPA não ficará disponível nesse modo**, pois você executou apenas a API e o banco. Para ver as telas, prefira `docker compose up -d --build` do projeto inteiro (não rode os dois modos simultaneamente porque ambos usariam a porta 8080).

## 10. Problemas comuns

**`docker` não é reconhecido:** Docker Desktop ainda não está instalado ou terminal precisa ser reaberto. **Cannot connect to Docker daemon:** inicie Docker Desktop. **Falha WSL / virtualization:** use `wsl --status`, atualize WSL e habilite virtualização na BIOS.

**Porta 8080 ocupada:** feche outra aplicação que usa 8080 ou altere a linha `127.0.0.1:8080:80` no serviço `frontend` para `127.0.0.1:8081:80`, depois acesse http://localhost:8081 .

**Docker subnet already in use / overlaps:** a subnet 172.28.60.0/24 pode colidir com sua rede/VPN. É preciso alterar os IPs fixos do `docker-compose.yml` e a allowlist correspondente em `bd/pg_hba.conf`; não mude apenas um deles.

**`backend` não sobe ou login falha:** veja `docker compose logs -f backend pgbouncer db`. Para a primeira inicialização, aguarde a carga SQL terminar e confirme `docker compose ps`.

**Mudou `backup.sql`, mas banco não atualiza:** o script SQL roda apenas ao criar o volume. Se forem dados de laboratório e você **autorizar a perda**, execute `docker compose down -v` e depois `docker compose up --build`.

**No Windows, `.ps1` bloqueado:** use `powershell -ExecutionPolicy Bypass -File ...` como na seção 7.

## 11. Publicação para entregar ao professor

**Não inclua arquivos de dados físicos do PostgreSQL no GitHub.** A pasta de dados fica no volume Docker `postgres_data`, não no repositório. Confira `.gitignore` e publique apenas arquivos-fonte, scripts, documentação e Docker.

```powershell
git init
git add .
git commit -m "feat: entrega G10 fullstack e seguranca avancada PostgreSQL"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/g10-gestao-academica.git
git push -u origin main
```

Crie antes um repositório **público e vazio** em https://github.com/new e substitua `SEU-USUARIO`. O ZIP por si só não equivale à publicação no GitHub.

## 12. Resumo: o que devo mostrar na banca?

Nos primeiros **10 min**, explicar arquitetura, Docker, spring boot, roles, schemas, RLS, PgBouncer, timeouts, pg_hba, function, procedure, triggers e views. Nos **5 min seguintes**, demonstrar CRUD via navegador, procedure de notas, trigger de auditoria, isolamento RLS, PgBouncer e timeout. O roteiro cronometrado está em `docs/apresentacao-15-min.md`.

**Nota de honestidade:** o projeto tem verificação de código e scripts, mas a execução de contêineres exige teste no Windows com Docker Desktop; não trate testes não executados como aprovados.
