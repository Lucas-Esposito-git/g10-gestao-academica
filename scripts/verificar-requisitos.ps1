# Executar no PowerShell a partir da pasta raiz do projeto.
$ErrorActionPreference = 'Stop'
$consultas = @(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('app','audit') ORDER BY 1;",
    "SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname LIKE 'rl_%' OR rolname LIKE 'usr_%' ORDER BY 1;",
    "SELECT schemaname,viewname FROM pg_views WHERE schemaname='app';",
    "SELECT n.nspname,p.proname,p.prokind FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('app','audit') ORDER BY 1,2;",
    "SELECT event_object_table,trigger_name FROM information_schema.triggers WHERE event_object_schema='app';",
    "SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='app';",
    "SELECT name,setting,unit FROM pg_settings WHERE name IN ('statement_timeout','idle_in_transaction_session_timeout','password_encryption');",
    "SELECT line_number,address,auth_method,error FROM pg_hba_file_rules ORDER BY line_number;",
    'SELECT * FROM app.vw_boletim ORDER BY matricula_id;'
)
foreach ($sql in $consultas) {
    Write-Host "`n--- $sql" -ForegroundColor Cyan
    docker compose exec -T -u postgres db psql -v ON_ERROR_STOP=1 -U postgres -d academico -c $sql
    if ($LASTEXITCODE -ne 0) { throw "Comando SQL falhou: $sql" }
}
Write-Host "`nVerificação concluída." -ForegroundColor Green
