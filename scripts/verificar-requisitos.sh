#!/bin/sh
# Execute na raiz: sh scripts/verificar-requisitos.sh
set -eu
printf '\n=== PostgreSQL: schemas, roles, views, functions, procedure, triggers e RLS ===\n'
docker compose exec -T -u postgres db psql -v ON_ERROR_STOP=1 -U postgres -d academico <<'SQL'
SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('app','audit') ORDER BY 1;
SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname IN ('rl_leitor','rl_escritor','rl_professor','rl_coordenador','usr_professor','usr_coordenador','usr_auth') ORDER BY 1;
SELECT schemaname,viewname FROM pg_views WHERE schemaname='app' ORDER BY viewname;
SELECT n.nspname,p.proname, CASE WHEN p.prokind='p' THEN 'PROCEDURE' ELSE 'FUNCTION' END tipo
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='app' ORDER BY 1,2;
SELECT event_object_schema, event_object_table, trigger_name
FROM information_schema.triggers WHERE event_object_schema='app' ORDER BY 1,2,3;
SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='app' ORDER BY 1,2;
SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('matriculas','notas','frequencias') ORDER BY relname;
SELECT name,setting,unit FROM pg_settings WHERE name IN ('statement_timeout','idle_in_transaction_session_timeout','password_encryption');
SELECT rolname,rolconfig FROM pg_roles WHERE rolname IN ('usr_professor','usr_coordenador');
SELECT line_number,type,database,user_name,address,auth_method,error FROM pg_hba_file_rules ORDER BY line_number;
SELECT * FROM app.vw_boletim ORDER BY matricula_id LIMIT 5;
SQL
printf '\n=== Validação finalizada: compare os resultados com docs/checklist-avaliacao.md ===\n'
