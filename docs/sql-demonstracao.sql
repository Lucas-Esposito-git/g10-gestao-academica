-- Arquivo com consultas para o professor/avaliador.
-- Exemplo: docker compose exec -T -u postgres db psql -U postgres -d academico -f /dev/stdin < docs/sql-demonstracao.sql
-- (psql rodando como admin PostgreSQL; para testar RLS use scripts/testar-rls.sh)

-- 1. Schemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('app','audit');

-- 2. Segurança, RLS e roles
SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname LIKE 'rl_%' OR rolname LIKE 'usr_%';
SELECT * FROM pg_policies WHERE schemaname='app';
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='app' ORDER BY tablename;

-- 3. Function: média, percentual e aprovação
SELECT * FROM app.fn_situacao_aluno(1);

-- 4. Views
SELECT * FROM app.vw_boletim LIMIT 10;
SELECT * FROM app.vw_frequencia_resumo LIMIT 10;

-- 5. Triggers e auditoria
SELECT event_object_table,trigger_name FROM information_schema.triggers WHERE event_object_schema='app';
SELECT id,tabela,operacao,registro_id,usuario_id,criado_em FROM audit.log_eventos ORDER BY id DESC LIMIT 10;

-- 6. Configurações do PostgreSQL
SHOW statement_timeout;
SHOW idle_in_transaction_session_timeout;
SHOW password_encryption;
SELECT line_number,address,auth_method,error FROM pg_hba_file_rules ORDER BY line_number;
