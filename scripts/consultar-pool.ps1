# Executar no PowerShell a partir da pasta raiz do projeto.
$ErrorActionPreference = 'Stop'
$senha = if ($env:PGBOUNCER_ADMIN_PASSWORD) { $env:PGBOUNCER_ADMIN_PASSWORD } else { 'PoolAdminDemo123!' }
docker compose exec -T -e "PGPASSWORD=$senha" db psql -X -h pgbouncer -p 6432 -U pgb_admin -d pgbouncer -c 'SHOW POOLS;'
if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar PgBouncer.' }
